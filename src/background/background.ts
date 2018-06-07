import { ajax } from "../common/ajax";
import { sleep } from "../common/sleep";

// tslint:disable-next-line
interface ICustomWindow extends Window {
    readingList: any;
}
declare var window: ICustomWindow;

// Storage methods
function getStorage() {
    try {
        if (browser.storage.sync.get(null)) {
            return browser.storage.sync;
        }
    } catch (e) { /* ignore */ }
    return browser.storage.local;
}
const store = getStorage();
function setSettings(values: { [key: string]: any }) {
    return store.set(values);
}
function getSettings() {
    return store.get(undefined);
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
            url: link.href,
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
    const links = xml.getElementsByClassName("a_search") as HTMLCollectionOf<HTMLLinkElement>;

    const results = [];
    for (const link of links) {
        const img = link.getElementsByTagName("img")[0];
        const name = link.getElementsByTagName("span")[0];
        results.push({
            name: name.innerHTML.trim(),
            url: link.href,
            img: img.src,
        });
    }

    return results;
}

// List management functions
async function putInList(id: number) {
    return ajax(`https://www.novelupdates.com/updatelist.php?sid=${id}&lid=0&act=move`);
}
async function removeFromList(id: number) {
    return ajax(`https://www.novelupdates.com/readinglist_update.php?rid=0&sid=${id}&checked=noo`);
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

// Get the status of novels in the user's reading list
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
            url: novelLink.href,
            status: {
                id: parseInt(checkboxInput.value.substr(0, checkboxInput.value.indexOf(":")), 10),
                name: statusLink.innerHTML,
                url: statusLink.href,
            },
            latest: {
                id: parseInt(latestIdInput.value, 10),
                name: latestLink.innerHTML,
                url: latestLink.href,
            },
        };

        if (novel.status.id !== novel.latest.id) {
            novelsWithChanges++;
        }
        novels.push(novel);
    }

    browser.browserAction.setBadgeText({ text: novelsWithChanges > 0 ? novelsWithChanges.toString() : "" });
    browser.browserAction.setBadgeBackgroundColor({ color: "red" });

    return novels;
}

// Reading list accessor
async function reloadReadingList() {
    window.readingList = await loadReadingList();
}
async function getReadingList() {
    if (window.readingList === undefined) {
        await reloadReadingList();
    }
    return window.readingList;
}
setInterval(reloadReadingList, 5 * 60 * 1000);

// Initial load
(async () => {
    if (await checkLoginStatus() || await tryLogin()) {
        reloadReadingList();
    }
})();
