import { ajax } from "./ajax";
import { Storage } from "./Storage";

export interface ISearchResult {
    name: string;
    html?: string;
    url: string;
    img: string;
}

export interface IReadingListResultChapter {
    id: number;
    name: string;
    html?: string;
    url?: string;
    date?: Date;
}

export interface IReadingListResult {
    id: number;
    name: string;
    url: string;
    notes: {
        hasNotes: boolean;
        tags: string[];
        notes?: string;
    };
    status: IReadingListResultChapter;
    next?: IReadingListResultChapter;
    nextLength: number;
    latest: IReadingListResultChapter;
    readingList: number;
    manual?: boolean;
    ignore?: boolean;
}

export interface IReadingList {
    id: number;
    name: string;
    description: string;
    iconUrl: string;
    novels?: IReadingListResult[];
}

function fixUrl(url: string): string {
    if (url.startsWith("moz-extension://")) {
        return "https:" + url.substr(14);
    }
    if (url.startsWith("chrome-extension://")) {
        return "https:" + url.substr(17);
    }
    if (url.startsWith("//")) {
        return "https:" + url;
    }
    if (url.startsWith("/")) {
        return "https://www.novelupdates.com" + url;
    }
    return url;
}

function chapterFromLink(id: number, link: HTMLAnchorElement): IReadingListResultChapter {
    const url = fixUrl(link.href);
    let date: Date | undefined;
    if (link.hasAttribute("onmousedown")) {
        const event = link.getAttribute("onmousedown");
        const match = event && event.match(/latestchp\((?:[^,]+,){4}'(\d{4}-\d{2}-\d{2})/);
        if (match && match.length >= 2) {
            date = new Date(match[1]);
        }
    }
    return {
        id,
        name: (link.textContent || link.innerText || "").trim(),
        html: link.innerHTML.trim(),
        url: !url.includes("novelupdates.com/extnu/") ? url : undefined,
        date,
    };
}

export class NovelUpdatesClient {
    constructor(private storage: Storage) {}

    // Perform a series search
    public async search(query: string): Promise<ISearchResult[]> {
        const rq = await ajax("https://www.novelupdates.com/wp-admin/admin-ajax.php", "POST", {
            action: "nd_ajaxsearchmain",
            strType: "desktop",
            strOne: query,
        });
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const links = xml.getElementsByClassName("a_search") as HTMLCollectionOf<HTMLAnchorElement>;

        const results: ISearchResult[] = [];
        for (const link of links) {
            const img = link.getElementsByTagName("img")[0];
            const name = link.getElementsByTagName("span")[0];
            results.push({
                name: (name.textContent || name.innerText || "").trim(),
                html: name.innerHTML.trim(),
                url: fixUrl(link.href),
                img: fixUrl(img.src),
            });
        }

        return results;
    }

    // List management functions
    public async putInList(id: number, listId: number): Promise<XMLHttpRequest> {
        return ajax(`https://www.novelupdates.com/updatelist.php?sid=${id}&lid=${listId}&act=move`);
    }
    public async removeFromList(id: number): Promise<XMLHttpRequest> {
        return ajax(`https://www.novelupdates.com/readinglist_update.php?rid=0&sid=${id}&checked=noo`);
    }
    public async getIdFromUrl(url: string): Promise<number> {
        const rq = await ajax(url);
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const input = xml.getElementById("mypostid") as HTMLInputElement;
        return parseInt(input.value, 10);
    }

    // Update a chapter "read" status
    public async markChapterRead(seriesId: number, releaseId: number): Promise<boolean> {
        const baseUrl = "https://www.novelupdates.com";
        const rq = await ajax(baseUrl + `/readinglist_update.php?rid=${releaseId}&sid=${seriesId}&checked=yes`);
        return rq.status === 200;
    }
    public async markChapterReadManual(seriesId: number, listId: number, text: string): Promise<boolean> {
        const baseUrl = "https://www.novelupdates.com";
        const rq = await ajax(baseUrl + `/readinglist_manualupdate.php?tdata=${text}&sid=${seriesId}&lid=${listId}`);
        return rq.status === 200;
    }

    // Get all chapters for a given series
    public async loadSeriesChapters(id: number): Promise<IReadingListResultChapter[]> {
        const rq = await ajax("https://www.novelupdates.com/wp-admin/admin-ajax.php", "POST", {
            action: "nd_getchapters",
            mypostid: id,
        });
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const bullets = xml.getElementsByClassName("sp_li_chp") as HTMLCollectionOf<HTMLLIElement>;

        // Parse chapters
        const results: IReadingListResultChapter[] = [];
        for (const bullet of bullets) {
            const link = bullet.getElementsByTagName("a")[1];
            const span = link.getElementsByTagName("span")[0];
            const url = fixUrl(link.href);
            results.push({
                id: parseInt(link.dataset.id, 10),
                name: (span.textContent || span.innerText || "").trim(),
                html: span.innerHTML.trim(),
                url: !url.includes("novelupdates.com/extnu/") ? url : undefined,
            });
        }

        // Elements are returned "new to old", but we want "old to new"
        results.reverse();

        return results;
    }

    // Get the list of next chapters
    private async getNextChaptersByUrl(
        url: string,
        currentChapter: number,
    ): Promise<IReadingListResultChapter[]> {
        const cacheKey = "nextChapters_" + url;
        let chapters: IReadingListResultChapter[] = await this.storage.getCache(cacheKey);
        if (!chapters) {
            const rq = await ajax(url);
            const parser = new DOMParser();
            const xml = parser.parseFromString(rq.responseText, "text/html");
            const nextLinks = xml.getElementsByClassName("getchps") as HTMLCollectionOf<HTMLAnchorElement>;

            chapters = [];
            for (let i = nextLinks.length - 1; i >= 0; --i) {
                const nextLink = nextLinks[i];
                const id = parseInt(nextLink.id.match(/^mycurrent(\d+)$/)[1], 10);
                if (id !== currentChapter) {
                    chapters.push(chapterFromLink(id, nextLink));
                }
            }
            await this.storage.setCache(cacheKey, chapters, 24 * 60 * 60 * 1000);
        }
        return chapters;
    }

    // Check if we are logged in
    public async checkLoginStatus(): Promise<boolean> {
        const cookies = await browser.cookies.getAll({ url: "https://www.novelupdates.com" });
        for (const cookie of cookies) {
            if (cookie.name.startsWith("wordpress_logged_in")) {
                return true;
            }
        }
        return false;
    }

    // Send login request
    public async login(username: string, password: string, rememberMe: boolean = true): Promise<XMLHttpRequest> {
        return ajax("https://www.novelupdates.com/login/", "POST", {
            log: username,
            pwd: password,
            rememberme: rememberMe ? "forever" : undefined,
        });
    }

    public async getReadingLists(): Promise<IReadingList[]> {
        if (!await this.checkLoginStatus()) {
            return undefined;
        }

        const rq = await ajax("https://www.novelupdates.com/sort-reading-list/");
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const rows = xml.getElementById("myTable read_rl_sort").getElementsByTagName("tr");

        const lists: IReadingList[] = [];

        let id = 0;
        for (const row of rows) {
            const cells = row.getElementsByTagName("td");
            if (cells.length !== 4) {
                continue;
            }

            const readingList: IReadingList = {
                id: id++,
                name: (cells[1].textContent || cells[1].innerText || "").replace(/ \(Disabled\)$/, "").trim(),
                description: (cells[2].textContent || cells[2].innerText || "").trim(),
                iconUrl: fixUrl(cells[3].getElementsByTagName("img")[0].src),
            };

            lists.push(readingList);
        }

        return lists;
    }

    private getChapterByName(
        name: string,
        chapters: IReadingListResultChapter[],
    ): IReadingListResultChapter | undefined {
        const equals = chapters.filter((chapter) => chapter.name === name);
        if (equals.length > 0) {
            const ret = equals[0];
            if (equals.length > 1) {
                ret.html += " <span class='text-warning' title='More than one chapter with this name'>\
                    <i class='fa fa-exclamation-triangle'></i>\
                </span>";
            }
            return ret;
        }

        // tslint:disable-next-line:no-console
        console.log("No chapter found by name", name);
        return undefined;
    }

    public async getNovelChapters(novel: IReadingListResult): Promise<IReadingListResultChapter[]> {
        const cacheKey = "chapters_" + novel.id;
        let chapters: IReadingListResultChapter[] = await this.storage.getCache(cacheKey);
        const wrongLatest = chapters
            && chapters.length >= 1
            && novel.latest.id !== undefined
            && chapters[chapters.length - 1].id !== novel.latest.id;
        if (!chapters || wrongLatest) {
            chapters = await this.loadSeriesChapters(novel.id);
            const storageDuration = (novel.latest.id !== undefined ? 24 : 2) * 60 * 60 * 1000;
            await this.storage.setCache(cacheKey, chapters, storageDuration);
        }
        return chapters;
    }

    public async getReadingListNovels(id: number, ignore?: boolean): Promise<IReadingListResult[] | undefined> {
        if (!await this.checkLoginStatus()) {
            return undefined;
        }

        const rq = await ajax(`https://www.novelupdates.com/reading-list/?list=${id}`);
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const rows = xml.getElementsByClassName("rl_links") as HTMLCollectionOf<HTMLTableRowElement>;

        const manualCheckbox = xml.getElementsByName("chk_mrl") as NodeListOf<HTMLInputElement>;
        const manual = manualCheckbox.length > 0 && manualCheckbox[0].checked;

        const novels: IReadingListResult[] = [];

        for (const row of rows) {
            const cells = row.getElementsByTagName("td");
            const checkboxInput = cells[0].getElementsByTagName("input")[0];
            const novelLink = cells[1].getElementsByTagName("a")[0];

            let status: IReadingListResultChapter;
            let latest: IReadingListResultChapter;

            const chapterLinks = row.getElementsByClassName("chp-release");
            if (chapterLinks.length >= 2) {
                const statusLink = chapterLinks[0] as HTMLAnchorElement;
                const latestLink = chapterLinks[1] as HTMLAnchorElement;
                const inputs = Array.from(row.getElementsByTagName("input"));
                const latestIdInput = inputs.filter((i) => i.type === "hidden")[0];

                status = chapterFromLink(
                    parseInt(checkboxInput.value.substr(0, checkboxInput.value.indexOf(":")), 10),
                    statusLink,
                );
                latest = chapterFromLink(
                    parseInt(latestIdInput.value, 10),
                    latestLink,
                );
            } else {
                const text = cells[2].textContent || cells[2].innerText || "";
                const parts = text.split("/").map((s: string) => s.trim());

                status = {
                    id: undefined,
                    name: parts[0],
                };
                latest = {
                    id: undefined,
                    name: parts[1],
                };
            }

            // Construct the novel object
            const novel: IReadingListResult = {
                id: parseInt(row.dataset.sid || "0", 10),
                name: row.dataset.title,
                url: fixUrl(novelLink.href),
                notes: {
                    hasNotes: row.dataset.notes === "yes",
                    tags: row.dataset.tags.split(",").filter((t) => t.length > 0),
                },
                status,
                nextLength: 0,
                latest,
                readingList: id,
            };

            // Manual reading list
            if (manual) {
                novel.manual = manual;
            }

            // Ignored reading lists
            if (ignore) {
                novel.ignore = ignore;
            }

            await this.loadNextChapters(novel, row);
            novels.push(novel);
        }

        return novels;
    }

    public async refreshNovel(novel: IReadingListResult): Promise<boolean> {
        if (!await this.checkLoginStatus()) {
            return false;
        }

        const rq = await ajax(`https://www.novelupdates.com/reading-list/?list=${novel.readingList}`);
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const rows = xml.getElementsByClassName("rl_links") as HTMLCollectionOf<HTMLTableRowElement>;

        // Find the proper row in the reading list
        const row = Array.from(rows).find((r) => {
            const id = parseInt(r.dataset.sid || "0", 10);
            return id > 0 && id === novel.id;
        });
        if (!row) {
            return false;
        }

        await this.loadNextChapters(novel, row);
        return true;
    }

    private async loadNextChapters(novel: IReadingListResult, row: HTMLTableRowElement): Promise<void> {
        // Load the chapters
        const chapters = await this.getNovelChapters(novel);

        // Fix status/latest information
        if (novel.status.id === undefined) {
            const replace = this.getChapterByName(novel.status.name, chapters);
            if (replace) {
                novel.status = replace;
            }
        }
        if (novel.latest.id === undefined) {
            const replace = this.getChapterByName(novel.latest.name, chapters);
            if (replace) {
                novel.latest = replace;
            }
        }

        // Load and build next chapters if necessary
        novel.next = undefined;
        novel.nextLength = 0;

        if (novel.status.id !== undefined && novel.status.id !== novel.latest.id) {

            const fullNext: { [key: number]: IReadingListResultChapter } = {};

            // Load the next three chapters with correct URLs
            const nextChapterSpan = row.getElementsByClassName("show-pop")[0] as HTMLSpanElement;
            if (nextChapterSpan) {
                const nextChaptersUrl = nextChapterSpan.dataset.url;
                const next = await this.getNextChaptersByUrl(nextChaptersUrl, novel.status.id);
                for (const chapter of next) {
                    fullNext[chapter.id] = chapter;
                }
            }

            // Build the "next" object
            const index = chapters.map((c) => c.id).indexOf(novel.status.id);
            novel.nextLength = chapters.length - index - 1;
            if (index + 1 < chapters.length) {
                const chapter = chapters[index + 1];
                novel.next = chapter.id in fullNext ? fullNext[chapter.id] : chapter;
            }
        }
    }
}
