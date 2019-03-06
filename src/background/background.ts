import { setBadge } from "../common/badge";
import { ContentScriptsManager } from "../common/ContentScriptsManager";
import { waitForPermission } from "../common/Listener";
import { notify } from "../common/notifications";
import { IReadingListResult, IReadingListResultChapter, NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { Permissions } from "../common/Permissions";
import { ReadChapterListener } from "../common/ReadChapterListener";
import { Settings } from "../common/Settings";
import { sleep } from "../common/sleep";
import { Storage } from "../common/Storage";

interface ICustomWindow extends Window {
    readingLists: any;
    readingList: any;
    settings: Settings;
    permissions: Permissions;
    client: NovelUpdatesClient;
    nextListRefresh: Date;
    networkError?: string;
}
declare var window: ICustomWindow;

const storage = new Storage();
const settings = new Settings(storage);
const permissions = new Permissions();
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

function isValid(value: number, operator: string, other: number): boolean {
    if (operator === "gt") {
        return value > other;
    } else if (operator === "ge") {
        return value >= other;
    } else if (operator === "eq") {
        return value === other;
    } else if (operator === "le") {
        return value <= other;
    } else if (operator === "lt") {
        return value < other;
    }
    return false;
}

// Get the status of novels in the user's reading list
const lastChanges: { [novelId: number]: number } = {};
async function loadReadingList(): Promise<IReadingListResult[] | undefined> {
    const readingLists = await client.getReadingLists();
    window.readingLists = readingLists;

    const groups = await settings.groups.get();

    const novels: IReadingListResult[] = [];
    if (groups.length > 0) {
        for (const group of groups) {
            for (const id of group.readingLists) {
                const l = await client.getReadingListNovels(id);
                if (!l) {
                    continue;
                }
                for (const novel of l) {
                    let valid: boolean = true;
                    for (const filter of group.filters) {
                        const val = novel.next.length;
                        valid = valid && isValid(val, filter.operator, filter.value);
                    }
                    if (valid) {
                        novels.push(novel);
                    }
                }
            }
        }
    } else {
        for (const readingList of readingLists) {
            const l = await client.getReadingListNovels(readingList.id);
            if (l) {
                novels.push(...l);
            }
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
    const notificationsEnabled = await settings.notifications.get();
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
    try {
        window.readingList = await loadReadingList();
        window.networkError = undefined;
    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log("Error loading reading list", e);
        setBadge("Error", "red", "white");
        window.networkError = e.toString();
    }

    // Clear previous timeout if this call was triggered manually
    if (listRefreshIntervalId) {
        window.clearTimeout(listRefreshIntervalId);
    }

    // Plan a reload after the next interval
    const interval = await settings.interval.get();
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
const readChapterListener = new ReadChapterListener(
    getReadingList,
    async (novel: IReadingListResult, chapter: IReadingListResultChapter) => {
        await client.markChapterRead(novel.id, chapter.id);
        await reloadReadingList();
    },
);

// Sidebar checker
browser.runtime.onMessage.addListener((msg, sender) => {
    if ("type" in msg && msg.type === "check-is-sidebar") {
        return Promise.resolve(!sender.tab || !sender.tab.id);
    }
    if ("type" in msg && msg.type === "get-setting") {
        return (settings as any)[msg.key].get();
    }
});

// Custom CSS
const domains = [
    "www.webnovel.com",
    "m.webnovel.com",
    "www.wuxiaworld.com",
];
const contentScriptsManager = new ContentScriptsManager(domains, "src/userstyles/bundle.js");

// Fill window object for popup and sidebar
window.settings = settings;
window.client = client;
window.permissions = permissions;

// Initial load
(async () => {
    await storage.init();

    // Show "loading" notification
    await setBadge("...", "gray", "white");

    // Initialize permissions
    await permissions.init();
    waitForPermission(readChapterListener, permissions.webNavigation);
    waitForPermission(contentScriptsManager, permissions.contentScripts);

    // Start reloading the reading list
    if (await checkLoginStatus()) {
        reloadReadingList();
    }
})();
