import { notify } from "../common/notifications";
import { IReadingListResult, NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { sleep } from "../common/sleep";
import { Storage } from "../common/Storage";

interface ICustomWindow extends Window {
    readingList: any;
    storage: Storage;
    client: NovelUpdatesClient;
    nextListRefresh: Date;
}
declare var window: ICustomWindow;

const storage = new Storage();
const client = new NovelUpdatesClient();

// Check if we are logged in
async function checkLoginStatus(login: boolean = false): Promise<boolean> {
    const status = await client.checkLoginStatus();
    if (!status) {
        if (login) {
            const loginResult = await tryLogin();
            if (loginResult) {
                return loginResult;
            }
        }
        await browser.browserAction.setBadgeText({ text: "OFF" });
        await browser.browserAction.setBadgeBackgroundColor({ color: "orange" });
    }
    return status;
}
async function tryLogin(): Promise<boolean> {
    const settings = await storage.getSettings();
    if (!settings || !settings.username || !settings.password) {
        return false;
    }
    client.login(settings.username, settings.password);
    for (let i = 0; i < 30; ++i) {
        if (await client.checkLoginStatus()) {
            return true;
        }
        await sleep(100);
    }
    return false;
}

// Get the status of novels in the user's reading list
const lastChanges: { [novelId: number]: number } = {};
async function loadReadingList(): Promise<IReadingListResult[]> {
    const novels = await client.getReadingList();
    if (!novels) {
        return undefined;
    }

    // Get novels with changes
    let novelsWithChanges = 0;
    const novelsWithNewChanges = [];
    for (const novel of novels) {
        if (novel.status.id !== novel.latest.id) {
            novelsWithChanges++;
            if (!(novel.id in lastChanges) || lastChanges[novel.id] !== novel.latest.id) {
                novelsWithNewChanges.push(`${novel.name} (${novel.latest.name})`);
                lastChanges[novel.id] = novel.latest.id;
            }
        }
    }

    // Push notification
    const notificationsEnabled = await storage.getSetting("notifications");
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
async function reloadReadingList(): Promise<void> {
    window.readingList = await loadReadingList();

    // Clear previous timeout if this call was triggered manually
    if (listRefreshIntervalId) {
        window.clearTimeout(listRefreshIntervalId);
    }

    // Plan a reload after the next interval
    const interval = await storage.getSetting("interval");
    const intervalMs = interval * 60 * 1000;
    listRefreshIntervalId = window.setTimeout(reloadReadingList, intervalMs);
    window.nextListRefresh = new Date(new Date().getTime() + intervalMs);
}
async function getReadingList(): Promise<IReadingListResult[]> {
    if (window.readingList === undefined) {
        await reloadReadingList();
    }
    return window.readingList;
}

// Check when a chapter has been finished
browser.webNavigation.onCommitted.addListener(async (data) => {
    // Ignore iframe navigation
    if (data.frameId !== 0) {
        return;
    }

    const tabId: string = "tabUrl_" + data.tabId.toString();

    const autoMarkAsRead: boolean = await storage.getSetting("autoMarkAsRead");
    if (autoMarkAsRead) {
        if (tabId in window.sessionStorage) {
            const oldUrl = window.sessionStorage[tabId];
            const readingList = await getReadingList();
            for (const novel of readingList) {
                if (novel.next.length >= 2
                    && novel.next[0].url === oldUrl
                    && novel.next[1].url === data.url
                ) {
                    await client.markChapterRead(novel.id, novel.next[0].id);
                    await reloadReadingList();
                }
            }
        }
    }

    window.sessionStorage[tabId] = data.url;
});

// Sidebar checker
browser.runtime.onMessage.addListener(async (msg, sender) => {
    if ("type" in msg && msg.type === "check-is-sidebar") {
        return !sender.tab || !sender.tab.id;
    }
});

// Fill window object for popup and sidebar
window.storage = storage;
window.client = client;

// Initial load
(async () => {
    await storage.init();

    // Show "loading" notification
    await browser.browserAction.setBadgeText({ text: "..." });
    await browser.browserAction.setBadgeBackgroundColor({ color: "gray" });

    // Start reloading the reading list
    if (await checkLoginStatus(true)) {
        reloadReadingList();
    }
})();
