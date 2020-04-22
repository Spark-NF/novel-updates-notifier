// tslint:disable:max-line-length

import Vue from "vue";
import { ICustomWindow } from "../background/background";
import { clone } from "../common/clone";
import { IReadingListResult, IReadingListResultChapter, ISearchResult } from "../common/NovelUpdatesClient";
import { IGroup, Settings } from "../common/Settings";
import { Storage } from "../common/Storage";
import { secondsToString } from "../common/time";
import { tr } from "../common/translate";
import OptionsGeneral from "../options/components/OptionsGeneral.vue";
import OptionsGroups from "../options/components/OptionsGroups.vue";
import ChapterLink from "./components/ChapterLink.vue";
import NovelRow from "./components/NovelRow.vue";
import Popup from "./components/Popup.vue";

Vue.component("chapter-link", ChapterLink);
Vue.component("novel-row", NovelRow);
Vue.component("options-general", OptionsGeneral);
Vue.component("options-groups", OptionsGroups);
Vue.filter("tr", tr);

const background = browser.extension.getBackgroundPage() as ICustomWindow;
let app: Vue;

const storage = new Storage();
const settings = new Settings(storage);

function showLoader(msg: string): void {
    app.$data.loadingMessage = msg;
}
function hideLoader(): void {
    showLoader("");
}

async function addNovel(url: string) {
    showLoader(tr("loadingGettingNovelId"));
    app.$data.search.value = "";
    app.$data.search.results = [];
    const id = await background.client.getIdFromUrl(url);

    showLoader(tr("loadingAddingNovel"));
    await background.client.putInList(id, 0);

    showLoader(tr("loadingRefreshingNovels"));
    await background.reloadReadingList();
    await displayNovels();
}

// Show next refresh timer
async function updateRefreshLabel() {
    if (!background.nextListRefresh) {
        return;
    }

    const interval = settings.interval.get();
    const secs = Math.max(0, Math.round((background.nextListRefresh.getTime() - new Date().getTime()) / 1000));
    app.$data.novels.nextRefresh = secondsToString(secs, interval > 60);

    // Show network error
    app.$data.novels.error = background.networkError;
    app.$data.novels.cloudflareError = background.cloudflareError;
}
setInterval(updateRefreshLabel, 1000);

async function removeNovel(novel: IReadingListResult) {
    await background.client.removeFromList(novel.id);

    const index = app.$data.novels.results.indexOf(novel);
    if (index !== -1) {
        app.$data.novels.results.splice(index, 1);
    }
}

async function markChapterAsRead(chapter: IReadingListResultChapter | string, novel: IReadingListResult, cb?: () => void) {
    if (typeof chapter === "string") {
        await background.client.markChapterReadManual(novel.id, novel.readingList, chapter);
        novel.status = { id: undefined, name: chapter };
    } else {
        await background.client.markChapterRead(novel.id, chapter.id);
        novel.status = chapter;
    }

    await background.client.refreshNovel(novel);
    background.updateReadingList(novel);

    if (cb) {
        cb();
    }
}

async function displayNovels() {
    const novels = await background.getReadingList();

    // Populate the table
    app.$data.novels.results = novels;

    updateRefreshLabel();
    hideLoader();

    app.$data.novels.ok = true;
}

// Settings page
function openSettings() {
    app.$data.settings.open = true;
}
function closeSettings() {
    app.$data.settings.open = false;
}
function openGeneralSettings() {
    app.$data.settings.panel = "general";
}
function openGroupsSettings() {
    app.$data.settings.panel = "groups";
}

// Button to refresh novel list
async function refreshNovels() {
    showLoader(tr("loadingRefreshingNovels"));

    await background.reloadReadingList();
    await displayNovels();
}

// Show search results input change
let latestSearch = "";
async function doSearch() {
    if (app.$data.search.mode !== "search") {
        app.$data.search.results = [];
        return;
    }

    const val = app.$data.search.value.trim();
    if (val === latestSearch) {
        return;
    }

    latestSearch = val;
    if (val.length === 0) {
        app.$data.search.results = [];
    } else {
        app.$data.search.message = tr("loadingResults");
        const results = await background.client.search(val);

        // If the current val is deprecated because the user kept typing, stop here
        if (val !== latestSearch) {
            return;
        }

        app.$data.search.message = "";
        app.$data.search.results = results.slice(0, 5);
    }
}

// Store credentials on login form submit
async function doLogin() {
    showLoader(tr("loginLoading"));

    if (await background.tryLogin(app.$data.login.username, app.$data.login.password)) {
        app.$data.login.error = "";
        app.$data.login.ok = true;

        showLoader(tr("loadingReadingList"));
        await background.reloadReadingList();
        await displayNovels();
    } else {
        app.$data.login.error = tr("loginError");

        hideLoader();
    }

    return false;
}

async function saveGroups(groups: IGroup[]) {
    await settings.groups.set(clone(groups));
}

// Show novels or login form on popup load
(async () => {
    await storage.init();
    await settings.preload();

    app = new Popup({
        el: "#app",
        data: {
            loadingMessage: tr("loading"),
            login: {
                ok: true,
                error: "",
                username: "",
                password: "",
            },
            search: {
                value: "",
                message: "",
                mode: settings.searchMode.get(),
                results: [],
            },
            novels: {
                ok: false,
                error: "",
                cloudflareError: false,
                nextRefresh: "",
                results: [],
                editing: undefined,
            },
            settings: {
                open: false,
                panel: "general",
                groups: clone(settings.groups.get()),
                readingLists: clone(background.readingLists),
                hasSidebar: browser.sidebarAction !== undefined,
                hasBadge: !!(browser.browserAction && browser.browserAction.setBadgeText),
                openInSidebar: settings.readInSidebar.get(),
            },
        },
        computed: {
            settingsObj(): Settings {
                return settings;
            },
            searchResults(): ISearchResult[] {
                return this.search.mode === "search" ? this.search.results : [];
            },
            filteredNovels(): IReadingListResult[] {
                if (this.search.mode !== "filter") {
                    return this.novels.results;
                }
                const filters: string[] = this.search.value.toLowerCase().split(" ");
                return this.novels.results.filter((n: IReadingListResult) => {
                    const data = (n.name + " " + n.notes.tags).toLowerCase();
                    return filters.every((f: string) => data.includes(f));
                });
            },
        },
        created() {
            settings.readInSidebar.addEventListener("change", () => {
                this.settings.openInSidebar = settings.readInSidebar.get();
            });
        },
        methods: {
            doLogin,
            doSearch,
            refreshNovels,
            openSettings,
            closeSettings,
            openGeneralSettings,
            openGroupsSettings,
            addNovel,
            removeNovel,
            markChapterAsRead,
            saveGroups,
            setSearchMode(mode: string): void {
                this.search.mode = mode;
                settings.searchMode.set(mode); // Fire and forget
                doSearch();
            },
        },
    });

    if (await background.checkLoginStatus()) {
        showLoader(tr("loadingReadingList"));
        await displayNovels();
    } else {
        hideLoader();
        app.$data.login.ok = false;
    }
})();
