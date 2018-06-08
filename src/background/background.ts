import { ajax } from "../common/ajax";
import { notify } from "../common/notifications";
import { NovelUpdatesClient } from "../common/NovelUpdatesClient";
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
async function checkLoginStatus(): Promise<boolean> {
    const status = await client.checkLoginStatus();
    if (!status) {
        await browser.browserAction.setBadgeText({ text: "OFF" });
        await browser.browserAction.setBadgeBackgroundColor({ color: "orange" });
    }
    return status;
}
async function tryLogin() {
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
async function loadReadingList() {
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
    const notificationsEnabled = await storage.getSetting("notifications") || true;
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
    const interval = await storage.getSetting("interval");
    const intervalMs = interval * 60 * 1000;
    listRefreshIntervalId = window.setTimeout(reloadReadingList, intervalMs);
    window.nextListRefresh = new Date(new Date().getTime() + intervalMs);
}
async function getReadingList() {
    if (window.readingList === undefined) {
        await reloadReadingList();
    }
    return window.readingList;
}

// Fill window object for popup and sidebar
window.storage = storage;
window.client = client;

// Initial load
(async () => {
    await storage.init();

    // Show "loading" notification
    await browser.browserAction.setBadgeText({ text: "..." });
    await browser.browserAction.setBadgeBackgroundColor({ color: "gray" });

    // Close sidebar if possible
    if (browser.sidebarAction) {
        await browser.sidebarAction.close();
    }

    // Start reloading the reading list
    if (await client.checkLoginStatus() || await tryLogin()) {
        reloadReadingList();
    }
})();
