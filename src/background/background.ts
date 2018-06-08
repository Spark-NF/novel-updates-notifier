import { ajax } from "../common/ajax";
import { notify } from "../common/notifications";
import { sleep } from "../common/sleep";
import { Storage } from "../common/Storage";

interface ICustomWindow extends Window {
    readingList: any;
    storage: Storage;
    nextListRefresh: Date;
}
declare var window: ICustomWindow;

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

window.storage = new Storage();

// Get all chapters for a given series
async function loadSeriesChapters(id: number) {
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

// Perform a series search
async function search(query: string) {
    const rq = await ajax("https://www.novelupdates.com/wp-admin/admin-ajax.php", "POST", {
        action: "nd_ajaxsearchmain",
        strType: "desktop",
        strOne: query,
    });
    const parser = new DOMParser();
    const xml = parser.parseFromString(rq.responseText, "text/html");
    const links = xml.getElementsByClassName("a_search") as HTMLCollectionOf<HTMLAnchorElement>;

    const results = [];
    for (const link of links) {
        const img = link.getElementsByTagName("img")[0];
        const name = link.getElementsByTagName("span")[0];
        results.push({
            name: name.innerHTML.trim(),
            url: fixUrl(link.href),
            img: fixUrl(img.src),
        });
    }

    //tslint:disable
    console.log(results);
    return results;
}

// List management functions
async function putInList(id: number, listId: number) {
    return ajax(`https://www.novelupdates.com/updatelist.php?sid=${id}&lid=${listId}&act=move`);
}
async function removeFromList(id: number) {
    return ajax(`https://www.novelupdates.com/readinglist_update.php?rid=0&sid=${id}&checked=noo`);
}
async function getIdFromUrl(url: string) {
    const rq = await ajax(url);
    const parser = new DOMParser();
    const xml = parser.parseFromString(rq.responseText, "text/html");
    const input = xml.getElementById("mypostid") as HTMLInputElement;
    return parseInt(input.value, 10);
}

// Check if we are logged in
async function checkLoginStatus() {
    const cookies = await browser.cookies.getAll({ url: "https://www.novelupdates.com" });
    for (const cookie of cookies) {
        if (cookie.name.startsWith("wordpress_logged_in")) {
            return true;
        }
    }

    browser.browserAction.setBadgeText({ text: "OFF" });
    browser.browserAction.setBadgeBackgroundColor({ color: "orange" });
    return false;
}

// Send login request
function login(username: string, password: string) {
    return ajax("https://www.novelupdates.com/login/", "POST", {
        log: username,
        pwd: password,
    });
}
async function tryLogin() {
    const settings = await window.storage.getSettings();
    if (!settings || !settings.username || !settings.password) {
        return false;
    }
    login(settings.username, settings.password);
    for (let i = 0; i < 30; ++i) {
        if (await checkLoginStatus()) {
            return true;
        }
        await sleep(100);
    }
    return false;
}

// Get the list of next chapters
var nextChaptersCache: { [url: string]: any } = {};
async function getNextChaptersByUrl(url: string, currentChapter: number, latestChapter: number) {
    if (!(url in nextChaptersCache)) {
        const rq = await ajax(url);
        const parser = new DOMParser();
        const xml = parser.parseFromString(rq.responseText, "text/html");
        const nextLinks = xml.getElementsByClassName("getchps") as HTMLCollectionOf<HTMLAnchorElement>;

        const results = [];
        for (let i = nextLinks.length - 1; i >= 0; --i) {
            const nextLink = nextLinks[i];
            const nextId = parseInt(nextLink.id.match(/^mycurrent(\d+)$/)[1], 10);
            if (nextId === currentChapter || nextId === latestChapter) {
                continue;
            }
            results.push({
                id: nextId,
                name: nextLink.innerHTML,
                url: fixUrl(nextLink.href),
            });
        }
        nextChaptersCache[url] = results;
    }

    return nextChaptersCache[url];
}

// Get the status of novels in the user's reading list
const lastChanges: { [novelId: number]: number } = {};
async function loadReadingList() {
    if (!await checkLoginStatus()) {
        return;
    }

    const rq = await ajax("https://www.novelupdates.com/reading-list/");
    const parser = new DOMParser();
    const xml = parser.parseFromString(rq.responseText, "text/html");
    const rows = xml.getElementsByClassName("rl_links") as HTMLCollectionOf<HTMLTableRowElement>;

    const novels = [];
    let novelsWithChanges = 0;
    const novelsWithNewChanges = [];

    for (const row of rows) {
        const cells = row.getElementsByTagName("td");
        const checkboxInput = cells[0].getElementsByTagName("input")[0];
        const novelLink = cells[1].getElementsByTagName("a")[0];
        const statusLink = cells[2].getElementsByTagName("a")[0];
        const latestIdInput = cells[2].getElementsByTagName("input")[0];
        const latestLink = cells[3].getElementsByTagName("a")[0];

        const novel = {
            id: parseInt(row.dataset.sid || "0", 10),
            name: row.dataset.title,
            url: fixUrl(novelLink.href),
            status: {
                id: parseInt(checkboxInput.value.substr(0, checkboxInput.value.indexOf(":")), 10),
                name: statusLink.innerHTML,
                url: fixUrl(statusLink.href),
            },
            next: [] as any[],
            latest: {
                id: parseInt(latestIdInput.value, 10),
                name: latestLink.innerHTML,
                url: fixUrl(latestLink.href),
            },
        };

        if (novel.status.id !== novel.latest.id) {
            const nextChapterSpan = cells[3].getElementsByClassName("show-pop")[0] as HTMLSpanElement;
            const nextChaptersUrl = nextChapterSpan.dataset.url;
            novel.next = await getNextChaptersByUrl(nextChaptersUrl, novel.status.id, novel.latest.id);

            novelsWithChanges++;
            if (!(novel.id in lastChanges) || lastChanges[novel.id] !== novel.latest.id) {
                novelsWithNewChanges.push(`${novel.name} (${novel.latest.name})`);
                lastChanges[novel.id] = novel.latest.id;
            }
        }
        novels.push(novel);
    }

    // Push notification
    const notificationsEnabled = await window.storage.getSetting("notifications") || true;
    if (notificationsEnabled && novelsWithNewChanges.length > 0) {
        notify("New novel chapters available",  "- " + novelsWithNewChanges.join("\n- "));
    }

    // Badge notification
    browser.browserAction.setBadgeText({ text: novelsWithChanges > 0 ? novelsWithChanges.toString() : "" });
    browser.browserAction.setBadgeBackgroundColor({ color: "red" });

    return novels;
}

// Reading list accessor
let listRefreshIntervalId: number;
async function reloadReadingList() {
    window.readingList = await loadReadingList();

    // Clear previous timeout if this call was triggered manually
    if (listRefreshIntervalId) {
        window.clearTimeout(listRefreshIntervalId);
    }

    // Plan a reload after the next interval
    const interval = await window.storage.getSetting("interval");
    const intervalMs = interval * 60 * 1000;
    listRefreshIntervalId = window.setTimeout(reloadReadingList, intervalMs)
    window.nextListRefresh = new Date(new Date().getTime() + intervalMs);
}
async function getReadingList() {
    if (window.readingList === undefined) {
        await reloadReadingList();
    }
    return window.readingList;
}

// Initial load
(async () => {
    await window.storage.init();

    // Close sidebar if possible
    if (browser.sidebarAction) {
        await browser.sidebarAction.close();
    }

    // Start reloading the reading list
    if (await checkLoginStatus() || await tryLogin()) {
        reloadReadingList();
    }
})();
