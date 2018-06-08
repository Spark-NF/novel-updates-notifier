import { ajax, objectToParams } from "../common/ajax";
import { notify } from "../common/notifications";
import { sleep } from "../common/sleep";

// tslint:disable-next-line
interface ICustomWindow extends Window {
    readingList: any;
    listRefreshIntervalId: number;
    nextListRefresh: Date;
}
declare var window: ICustomWindow;

function fixUrl(url: string): string {
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

export interface ISettings {
    username?: string;
    password?: string;
    interval: number;
    notifications: boolean;
    readInSidebar: boolean;
}

// Sync storage with fallback on local one
function getStorage() {
    try {
        if (browser.storage.sync.get(null)) {
            return browser.storage.sync;
        }
    } catch (e) { /* ignore */ }
    return browser.storage.local;
}
const store = getStorage();

// Settings getters
let gSettings: ISettings;
async function reloadSettings() {
    let settings = await store.get(undefined);
    if (!settings) {
        settings = {};
    }
    gSettings = {
        username: settings.username,
        password: settings.password,
        interval: settings.interval || 5,
        notifications: settings.notifications === undefined ? true : settings.notifications,
        readInSidebar: settings.readInSidebar === undefined ? false : settings.readInSidebar,
    };
}
async function getSettings() {
    if (gSettings === undefined) {
        await reloadSettings();
    }
    return gSettings;
}
async function getSetting<K extends keyof ISettings>(key: K): Promise<ISettings[K]> {
    const settings = await getSettings();
    return settings[key];
}

// Settings setters
async function setSettings(values: { [key: string]: any }) {
    await store.set(values);
    await reloadSettings();
}

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
    const settings = await getSettings();
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
function getNextChapters(id: number, currentChapter: number, latestChapter: number, date: string) {
    const params = {
        rid: latestChapter,
        sid: id,
        date,
        nrid: currentChapter,
    };
    const url = `https://www.novelupdates.com/readinglist_getchp.php?${objectToParams(params)}`;
    return getNextChaptersByUrl(url, currentChapter, latestChapter);
}
async function getNextChaptersByUrl(url: string, currentChapter: number, latestChapter: number) {
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
    return results;
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
    const notificationsEnabled = await getSetting("notifications") || true;
    if (notificationsEnabled && novelsWithNewChanges.length > 0) {
        notify("New novel chapters available",  "- " + novelsWithNewChanges.join("\n- "));
    }

    // Badge notification
    browser.browserAction.setBadgeText({ text: novelsWithChanges > 0 ? novelsWithChanges.toString() : "" });
    browser.browserAction.setBadgeBackgroundColor({ color: "red" });

    return novels;
}

// Reading list accessor
async function reloadReadingList() {
    window.readingList = await loadReadingList();

    // Clear previous timeout if this call was triggered manually
    if (window.listRefreshIntervalId) {
        window.clearTimeout(window.listRefreshIntervalId);
    }

    // Plan a reload after the next interval
    const interval = await getSetting("interval");
    const intervalMs = interval * 60 * 1000;
    window.listRefreshIntervalId = window.setTimeout(reloadReadingList, intervalMs)
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
    // Close sidebar
    await browser.sidebarAction.close();

    // Start reloading the reading list
    if (await checkLoginStatus() || await tryLogin()) {
        reloadReadingList();
    }
})();
