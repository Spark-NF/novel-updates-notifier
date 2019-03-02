import { ajax } from "./ajax";
import { Storage } from "./Storage";

export interface ISearchResult {
    name: string;
    html: string;
    url: string;
    img: string;
}

export interface IReadingListResultChapter {
    id: number;
    name: string;
    html: string;
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
    chapters: IReadingListResultChapter[];
    status: IReadingListResultChapter;
    next: IReadingListResultChapter[];
    latest: IReadingListResultChapter;
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
    let date: Date;
    if (link.hasAttribute("onmousedown")) {
        const event = link.getAttribute("onmousedown");
        const match = event.match(/latestchp\((?:[^,]+,){4}'(\d{4}-\d{2}-\d{2})/);
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
    private nextChaptersCache: { [url: string]: IReadingListResultChapter[] } = {};
    private async getNextChaptersByUrl(
        url: string,
        currentChapter: number,
    ): Promise<IReadingListResultChapter[]> {
        if (!(url in this.nextChaptersCache)) {
            const rq = await ajax(url);
            const parser = new DOMParser();
            const xml = parser.parseFromString(rq.responseText, "text/html");
            const nextLinks = xml.getElementsByClassName("getchps") as HTMLCollectionOf<HTMLAnchorElement>;

            const results: IReadingListResultChapter[] = [];
            for (let i = nextLinks.length - 1; i >= 0; --i) {
                const nextLink = nextLinks[i];
                const id = parseInt(nextLink.id.match(/^mycurrent(\d+)$/)[1], 10);
                if (id !== currentChapter) {
                    results.push(chapterFromLink(id, nextLink));
                }
            }
            this.nextChaptersCache[url] = results;
        }

        return this.nextChaptersCache[url];
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

    public async getReadingListNovels(id: number): Promise<IReadingListResult[]> {
        if (!await this.checkLoginStatus()) {
            return undefined;
        }

        const rq = await ajax(`https://www.novelupdates.com/reading-list/?list=${id}`);
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const rows = xml.getElementsByClassName("rl_links") as HTMLCollectionOf<HTMLTableRowElement>;

        const novels: IReadingListResult[] = [];

        for (const row of rows) {
            const cells = row.getElementsByTagName("td");
            const checkboxInput = cells[0].getElementsByTagName("input")[0];
            const novelLink = cells[1].getElementsByTagName("a")[0];
            const chapterLinks = row.getElementsByClassName("chp-release");
            const statusLink = chapterLinks[0] as HTMLAnchorElement;
            const latestLink = chapterLinks[1] as HTMLAnchorElement;
            const latestIdInput = Array.from(row.getElementsByTagName("input")).filter((i) => i.type === "hidden")[0];

            // Construct the novel object
            const novel: IReadingListResult = {
                id: parseInt(row.dataset.sid || "0", 10),
                name: row.dataset.title,
                url: fixUrl(novelLink.href),
                notes: {
                    hasNotes: row.dataset.notes === "yes",
                    tags: row.dataset.tags.split(",").filter((t) => t.length > 0),
                },
                chapters: [] as IReadingListResultChapter[],
                status: chapterFromLink(
                    parseInt(checkboxInput.value.substr(0, checkboxInput.value.indexOf(":")), 10),
                    statusLink,
                ),
                next: [] as IReadingListResultChapter[],
                latest: chapterFromLink(
                    parseInt(latestIdInput.value, 10),
                    latestLink,
                ),
            };

            // Load the chapters
            const cacheKey = "chapters_" + novel.id;
            let chapters: IReadingListResultChapter[] = await this.storage.getCache(cacheKey);
            if (!chapters || (chapters.length >= 1 && chapters[chapters.length - 1].id !== novel.latest.id)) {
                chapters = await this.loadSeriesChapters(novel.id);
                await this.storage.setCache(cacheKey, chapters, 24 * 60 * 60 * 1000);
            }
            novel.chapters = chapters;

            // Load and build next chapters if necessary
            if (novel.status.id !== novel.latest.id) {

                // Load the next three chapters with correct URLs
                const nextChapterSpan = row.getElementsByClassName("show-pop")[0] as HTMLSpanElement;
                const nextChaptersUrl = nextChapterSpan.dataset.url;
                const next = await this.getNextChaptersByUrl(nextChaptersUrl, novel.status.id);
                const fullNext: { [key: number]: IReadingListResultChapter } = {};
                for (const chapter of next) {
                    fullNext[chapter.id] = chapter;
                }

                // Build the "next" object
                const index = chapters.map((c) => c.id).indexOf(novel.status.id);
                for (let i = index + 1; i < chapters.length; ++i) {
                    const chapter = chapters[i];
                    const fullChapter = chapter.id in fullNext ? fullNext[chapter.id] : chapter;
                    novel.next.push(fullChapter);
                }
            }

            novels.push(novel);
        }

        return novels;
    }
}
