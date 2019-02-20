import { setBadge } from "../common/badge";
import { notify } from "../common/notifications";
import { IReadingListResult, NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { sleep } from "../common/sleep";
import { Storage } from "../common/Storage";

declare var chrome: any;

interface ICustomWindow extends Window {
    readingList: any;
    storage: Storage;
    client: NovelUpdatesClient;
    nextListRefresh: Date;
}
declare var window: ICustomWindow;

const storage = new Storage();
const client = new NovelUpdatesClient(storage);

// Check if we are logged in
async function checkLoginStatus(): Promise<boolean> {
    const status = await client.checkLoginStatus();
    if (!status) {
        await setBadge("OFF", "orange", "white");
    }
    return status;
}
async function tryLogin(username: string, password: string): Promise<boolean> {
    if (!username || !password) {
        return false;
    }
    client.login(username, password);
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
    const readingLists = await client.getReadingLists();

    const novels: IReadingListResult[] = [];
    for (const readingList of readingLists) {
        const l = await client.getReadingListNovels(readingList.id);
        if (l) {
            novels.push(...l);
        }
    }
    if (novels.length === 0) {
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
    setBadge(novelsWithChanges > 0 ? novelsWithChanges.toString() : "", "red", "white");

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
function removeProtocol(url: string): string {
    if (url.startsWith("http:")) {
        return url.substring(5);
    }
    if (url.startsWith("https:")) {
        return url.substring(6);
    }
    return url;
}
async function onNavigation(data: any) {
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
                    && removeProtocol(novel.next[0].url) === removeProtocol(oldUrl)
                    && removeProtocol(novel.next[1].url) === removeProtocol(data.url)
                ) {
                    await client.markChapterRead(novel.id, novel.next[0].id);
                    await reloadReadingList();
                }
            }
        }
    }

    window.sessionStorage[tabId] = data.url;
}

// Sidebar checker
browser.runtime.onMessage.addListener(async (msg, sender) => {
    if ("type" in msg && msg.type === "check-is-sidebar") {
        return !sender.tab || !sender.tab.id;
    }
});

// Permission helpers
async function waitForPermission(permission: string, cb: () => void) {
    return waitForPermissions({
        permissions: [permission],
    }, cb);
}
async function waitForPermissions(permissions: any, cb: () => void) {
    // If we already have the permission, there is nothing to do
    if (await browser.permissions.contains(permissions)) {
        cb();
        return;
    }

    // Otherwise, we wait for the permission to be granted
    browser.permissions.onAdded.addListener(async () => {
        if (await browser.permissions.contains(permissions)) {
            cb();
        }
    });
}

// Ensure a function is called only once
function singleCall(cb: () => void): () => void {
    let called = false;
    return () => {
        if (called) {
            return;
        }
        called = true;
        cb();
    };
}

// Custom CSS
const domains = [
    "www.webnovel.com",
    "m.webnovel.com",
    "www.wuxiaworld.com",
];
const origins = domains.map((d: string) => "*://" + d + "/*");
async function enableCustomCss(): Promise<boolean> {
    return browser.permissions.request({ origins });
}
async function addCustomCssContentScripts() {
    // Firefox
    if (browser.contentScripts && browser.contentScripts.register) {
        await browser.contentScripts.register({
            matches: origins,
            allFrames: true,
            runAt: "document_start",
            js: [{
                file: "src/userstyles/bundle.js",
            }],
        });
        return;
    }

    // Chrome (disabled because custom CSS is a sidebar feature)
    if (false && chrome.declarativeContent && chrome.declarativeContent.onPageChanged) {
        chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
            chrome.declarativeContent.onPageChanged.addRules([{
                conditions: domains.map((d: string) => {
                    return new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {
                            hostEquals: d,
                        },
                    });
                }),
                actions: [
                    new chrome.declarativeContent.RequestContentScript({
                        js: ["src/userstyles/bundle.js"],
                    }),
                ],
            }]);
        });
    }
}

// Fill window object for popup and sidebar
window.storage = storage;
window.client = client;

// Initial load
(async () => {
    await storage.init();

    // Show "loading" notification
    await setBadge("...", "gray", "white");

    // Listen for permissions
    waitForPermission("webNavigation", singleCall(() => browser.webNavigation.onCommitted.addListener(onNavigation)));
    waitForPermissions({ origins }, singleCall(addCustomCssContentScripts));

    // Start reloading the reading list
    if (await checkLoginStatus()) {
        reloadReadingList();
    }
})();
