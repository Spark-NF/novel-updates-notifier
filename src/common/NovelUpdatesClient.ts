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
    url: string;
}

export interface IReadingListResult {
    id: number;
    name: string;
    url: string;
    chapters: IReadingListResultChapter[];
    status: IReadingListResultChapter;
    next: IReadingListResultChapter[];
    latest: IReadingListResultChapter;
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
    return {
        id,
        name: link.innerText.trim(),
        html: link.innerHTML.trim(),
        url: fixUrl(link.href),
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
                name: name.innerText.trim(),
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
            results.push({
                id: parseInt(link.dataset.id, 10),
                name: span.innerText.trim(),
                html: span.innerHTML.trim(),
                url: fixUrl(link.href),
            });
        }

        // Sort chapters by name
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
        return results.sort((a: IReadingListResultChapter, b: IReadingListResultChapter) => {
            return collator.compare(a.name, b.name);
        });
    }

    // Get the list of next chapters
    private nextChaptersCache: { [url: string]: IReadingListResultChapter[] } = {};
    private async getNextChaptersByUrl(url: string, currentChapter: number, latestChapter: number) {
        if (!(url in this.nextChaptersCache)) {
            const rq = await ajax(url);
            const parser = new DOMParser();
            const xml = parser.parseFromString(rq.responseText, "text/html");
            const nextLinks = xml.getElementsByClassName("getchps") as HTMLCollectionOf<HTMLAnchorElement>;

            const results: IReadingListResultChapter[] = [];
            for (let i = nextLinks.length - 1; i >= 0; --i) {
                const nextLink = nextLinks[i];
                const id = parseInt(nextLink.id.match(/^mycurrent(\d+)$/)[1], 10);
                if (id !== currentChapter && id !== latestChapter) {
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

    public async getReadingList(): Promise<IReadingListResult[]> {
        if (!await this.checkLoginStatus()) {
            return undefined;
        }

        const rq = await ajax("https://www.novelupdates.com/reading-list/");
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const rows = xml.getElementsByClassName("rl_links") as HTMLCollectionOf<HTMLTableRowElement>;

        const novels: IReadingListResult[] = [];

        for (const row of rows) {
            const cells = row.getElementsByTagName("td");
            const checkboxInput = cells[0].getElementsByTagName("input")[0];
            const novelLink = cells[1].getElementsByTagName("a")[0];
            const statusLink = cells[2].getElementsByTagName("a")[0];
            const latestIdInput = cells[2].getElementsByTagName("input")[0];
            const latestLink = cells[3].getElementsByTagName("a")[0];

            // Construct the novel object
            const novel: IReadingListResult = {
                id: parseInt(row.dataset.sid || "0", 10),
                name: row.dataset.title,
                url: fixUrl(novelLink.href),
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
            if (!chapters || chapters[chapters.length - 1].id !== novel.latest.id) {
                chapters = await this.loadSeriesChapters(novel.id);
                await this.storage.setCache(cacheKey, chapters, 24 * 60 * 60);
            }
            novel.chapters = chapters;

            // Build the "next" object
            const compareOpts = { numeric: true, sensitivity: "base" };
            for (const chapter of chapters) {
                if (chapter.name.localeCompare(novel.status.name, undefined, compareOpts) > 0) {
                    novel.next.push(chapter);
                }
            }

            novels.push(novel);
        }

        return novels;
    }
}
