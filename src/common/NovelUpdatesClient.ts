import { ajax } from "./ajax";

export interface ISearchResult {
    name: string;
    html: string;
    url: string;
    img: string;
}

export interface IReadingListResultChapter {
    id: number;
    number: number;
    name: string;
    html: string;
    url: string;
}

export interface IReadingListResult {
    id: number;
    name: string;
    url: string;
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

export class NovelUpdatesClient {
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
    public async loadSeriesChapters(id: number) {
        const rq = await ajax("https://www.novelupdates.com/wp-admin/admin-ajax.php", "POST", {
            action: "nd_getchapters",
            mypostid: 880,
        });
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const bullets = xml.getElementsByClassName("sp_li_chp") as HTMLCollectionOf<HTMLLIElement>;

        const results = [];
        for (const bullet of bullets) {
            const link = bullet.getElementsByTagName("a")[1];
            const span = link.getElementsByTagName("span")[0];
            results.push({
                id: parseInt(link.dataset.id, 10),
                name: span.innerHTML.trim(),
                url: fixUrl(link.href),
            });
        }

        return results;
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
                const nextId = parseInt(nextLink.id.match(/^mycurrent(\d+)$/)[1], 10);
                if (nextId === currentChapter || nextId === latestChapter) {
                    continue;
                }
                results.push({
                    id: nextId,
                    number: parseInt(nextLink.innerText.substring(1), 10),
                    name: nextLink.innerText,
                    html: nextLink.innerHTML,
                    url: fixUrl(nextLink.href),
                });
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

            const novel: IReadingListResult = {
                id: parseInt(row.dataset.sid || "0", 10),
                name: row.dataset.title,
                url: fixUrl(novelLink.href),
                status: {
                    id: parseInt(checkboxInput.value.substr(0, checkboxInput.value.indexOf(":")), 10),
                    number: parseInt(statusLink.innerText.substring(1), 10),
                    name: statusLink.innerText,
                    html: statusLink.innerHTML,
                    url: fixUrl(statusLink.href),
                },
                next: [] as IReadingListResultChapter[],
                latest: {
                    id: parseInt(latestIdInput.value, 10),
                    number: parseInt(latestLink.innerText.substring(1), 10),
                    name: latestLink.innerText,
                    html: latestLink.innerHTML,
                    url: fixUrl(latestLink.href),
                },
            };

            if (novel.status.id !== novel.latest.id) {
                const nextChapterSpan = cells[3].getElementsByClassName("show-pop")[0] as HTMLSpanElement;
                const nextChaptersUrl = nextChapterSpan.dataset.url;
                novel.next = await this.getNextChaptersByUrl(nextChaptersUrl, novel.status.id, novel.latest.id);
            }

            novels.push(novel);
        }

        return novels;
    }
}
