import { setBadge } from "../common/badge";
import { clone } from "../common/clone";
import { ContentScriptsManager } from "../common/ContentScriptsManager";
import { isValid } from "../common/Filter";
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
    client: NovelUpdatesClient;
    nextListRefresh: Date;
    networkError?: string;

    checkLoginStatus: (login?: boolean) => Promise<boolean>;
    getReadingList: () => Promise<IReadingListResult[]>;
    reloadReadingList: () => Promise<void>;
    tryLogin: (username: string, password: string) => Promise<boolean>;
    updateReadingList: (novel: IReadingListResult) => boolean;
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

// Get the status of novels in the user's reading list
const lastChanges: { [novelId: number]: number } = {};
async function notifyUser(novels: IReadingListResult[], notifications: boolean = true): Promise<void> {
    // Get novels with changes
    let novelsWithChanges = 0;
    const novelsWithNewChanges = [];
    for (const novel of novels) {
        if (novel.status.id && novel.status.id !== novel.latest.id) {
            novelsWithChanges += settings.sumUnreadChapters.get() ? novel.nextLength : 1;
            if (!(novel.id in lastChanges) || lastChanges[novel.id] !== novel.latest.id) {
                novelsWithNewChanges.push(`${novel.name} (${novel.latest.name})`);
                lastChanges[novel.id] = novel.latest.id;
            }
        }
    }

    // Push notification
    if (notifications) {
        const notificationsEnabled = settings.notifications.get();
        if (notificationsEnabled && novelsWithNewChanges.length > 0) {
            notify("New novel chapters available",  "- " + novelsWithNewChanges.join("\n- "));
        }
    }

    // Badge notification
    setBadge(novelsWithChanges > 0 ? novelsWithChanges.toString() : "", "red", "white");
}
async function loadReadingList(): Promise<IReadingListResult[]> {
    const readingLists = await client.getReadingLists();
    window.readingLists = readingLists;

    const groups = settings.groups.get();

    const novels: IReadingListResult[] = [];
    if (groups.length > 0) {
        for (const group of groups) {
            for (const id of group.readingLists) {
                const l = await client.getReadingListNovels(id);
                if (l) {
                    novels.push(...l.filter((novel) => isValid(novel, group.filters)));
                }
            }
        }
    } else {
        for (const list of readingLists) {
            const l = await client.getReadingListNovels(list.id);
            if (l) {
                novels.push(...l);
            }
        }
    }

    if (novels.length > 0) {
        notifyUser(novels);
    }

    return novels;
}

// Reading list accessor
let readingList: IReadingListResult[];
let listRefreshIntervalId: number;
let listRefreshPromise: Promise<IReadingListResult[]>;
async function reloadReadingList(): Promise<void> {
    try {
        if (!listRefreshPromise) {
            listRefreshPromise = loadReadingList();
        }
        readingList = await listRefreshPromise;
        window.networkError = undefined;
    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log("Error loading reading list", e);
        setBadge("Error", "red", "white");
        window.networkError = e.toString();
    } finally {
        listRefreshPromise = undefined;
    }

    // Clear previous timeout if this call was triggered manually
    if (listRefreshIntervalId) {
        window.clearTimeout(listRefreshIntervalId);
    }

    // Plan a reload after the next interval
    const interval = settings.interval.get();
    const intervalMs = interval * 60 * 1000;
    listRefreshIntervalId = window.setTimeout(reloadReadingList, intervalMs);
    window.nextListRefresh = new Date(new Date().getTime() + intervalMs);
}
async function getReadingList(): Promise<IReadingListResult[]> {
    if (readingList === undefined) {
        await reloadReadingList();
    }
    return clone(readingList);
}
function updateReadingList(novel: IReadingListResult): boolean {
    const index = readingList.findIndex((n) => n.id === novel.id && n.readingList === novel.readingList);
    if (index < 0) {
        return false;
    }
    readingList[index] = clone(novel);
    notifyUser(readingList, false);
    return true;
}

// Check when a chapter has been finished
const readChapterListener = new ReadChapterListener(
    getReadingList,
    async (novel: IReadingListResult, chapter: IReadingListResultChapter) => {
        if (novel.manual) {
            await client.markChapterReadManual(novel.id, novel.readingList, chapter.name);
        } else {
            await client.markChapterRead(novel.id, chapter.id);
        }
        novel.status = chapter;
        await client.refreshNovel(novel);
        updateReadingList(novel);
    },
);

// Sidebar checker
browser.runtime.onMessage.addListener((msg, sender) => {
    if ("type" in msg && msg.type === "check-is-sidebar") {
        return Promise.resolve(!sender.tab || !sender.tab.id);
    }
    if ("type" in msg && msg.type === "get-setting") {
        return Promise.resolve((settings as any)[msg.key].get());
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
window.client = client;
window.checkLoginStatus = checkLoginStatus;
window.getReadingList = getReadingList;
window.reloadReadingList = reloadReadingList;
window.tryLogin = tryLogin;
window.updateReadingList = updateReadingList;

// Initial load
(async () => {
    await storage.init();
    await settings.preload();

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
