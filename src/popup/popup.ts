// tslint:disable:max-line-length

import Vue from "vue";
import { clone } from "../common/clone";
import { IReadingList, IReadingListResult, IReadingListResultChapter, NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { IGroup, Settings } from "../common/Settings";
import { secondsToString } from "../common/time";
import OptionsGeneral from "../options/components/OptionsGeneral.vue";
import OptionsGroups from "../options/components/OptionsGroups.vue";
import ChapterLink from "./components/ChapterLink.vue";
import NovelRow from "./components/NovelRow.vue";

Vue.component("chapter-link", ChapterLink);
Vue.component("novel-row", NovelRow);
Vue.component("options-general", OptionsGeneral);
Vue.component("options-groups", OptionsGroups);

interface IBackground extends Window {
    settings: Settings;
    client: NovelUpdatesClient;
    readingLists: IReadingList[];

    checkLoginStatus: (login?: boolean) => Promise<boolean>;
    getReadingList: () => Promise<IReadingListResult[]>;
    reloadReadingList: () => Promise<void>;
    tryLogin: (username: string, password: string) => Promise<boolean>;

    nextListRefresh?: Date;
    networkError?: string;
}

const background = browser.extension.getBackgroundPage() as IBackground;
let app: Vue;

function showLoader(msg: string): void {
    app.$data.loadingMessage = msg;
}
function hideLoader(): void {
    showLoader("");
}

async function addNovel(url: string) {
    showLoader("Getting novel ID...");
    app.$data.search.value = "";
    app.$data.search.results = [];
    const id = await background.client.getIdFromUrl(url);

    showLoader("Adding novel...");
    await background.client.putInList(id, 0);

    showLoader("Refreshing novels...");
    await background.reloadReadingList();
    await displayNovels();
}

// Show next refresh timer
async function updateRefreshLabel() {
    if (!background.nextListRefresh) {
        return;
    }

    const interval = background.settings.interval.get();
    const secs = Math.max(0, Math.round((background.nextListRefresh.getTime() - new Date().getTime()) / 1000));
    app.$data.novels.nextRefresh = secondsToString(secs, interval > 60);

    // Show network error
    app.$data.novels.error = background.networkError;
}
setInterval(updateRefreshLabel, 1000);

async function removeNovel(novel: IReadingListResult) {
    await background.client.removeFromList(novel.id);

    const index = app.$data.novels.results.indexOf(novel);
    if (index !== -1) {
        app.$data.novels.results.splice(index, 1);
    }
}

async function markChapterAsRead(chapter: IReadingListResultChapter, novel: IReadingListResult) {
    showLoader("Applying change...");

    await background.client.markChapterRead(novel.id, chapter.id);
    if (novel.manual !== undefined) {
        await background.client.markChapterReadManual(novel.id, novel.manual, chapter.name);
    }

    showLoader("Reloading list...");
    await background.reloadReadingList();
    await displayNovels();
}

async function displayNovels() {
    const novels = await background.getReadingList();

    // Populate the table
    app.$data.novels.results = novels;

    updateRefreshLabel();
    hideLoader();

    app.$data.novels.ok = true;
}
function createIconButton(btnClass: string, iconClass: string, title: string): HTMLElement {
    return createIconElement("button", "btn btn-xs btn-icon btn-" + btnClass, iconClass, title);
}
function createIconElement(elt: string, clss: string, iconClass: string, title: string): HTMLElement {
    const button = document.createElement(elt);
    button.className = clss;
    button.title = title;

    const icon = document.createElement("i");
    icon.classList.add("fa");
    icon.classList.add("fa-" + iconClass);
    button.appendChild(icon);

    return button;
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
    showLoader("Refreshing novels...");

    await background.reloadReadingList();
    await displayNovels();
}

// Show search results input change
let latestSearch = "";
async function doSearch() {
    const val = app.$data.search.value.trim();
    latestSearch = val;
    if (val.length === 0) {
        app.$data.search.results = [];
    } else {
        app.$data.search.message = "Loading results...";
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
    showLoader("Logging in...");

    if (await background.tryLogin(app.$data.login.username, app.$data.login.password)) {
        app.$data.login.error = "";
        app.$data.login.ok = true;

        await background.reloadReadingList();
        await displayNovels();
    } else {
        app.$data.login.error = "Login failure";

        hideLoader();
    }

    return false;
}

async function saveGroups(groups: IGroup[]) {
    await background.settings.groups.set(groups);
}

// Show novels or login form on popup load
(async () => {
    app = new Vue({
        el: "#app",
        data: {
            loadingMessage: "Loading...",
            login: {
                ok: true,
                error: "",
                username: "",
                password: "",
            },
            search: {
                value: "",
                message: "",
                results: [],
            },
            novels: {
                ok: false,
                error: "",
                nextRefresh: "",
                results: [],
                editing: undefined,
            },
            settings: {
                open: false,
                panel: "general",
                groups: clone(background.settings.groups.get()),
                readingLists: clone(background.readingLists),
                settings: background.settings,
                hasSidebar: !!browser.sidebarAction,
            },
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
        },
    });

    if (await background.checkLoginStatus()) {
        showLoader("Loading reading list...");
        await displayNovels();
    } else {
        hideLoader();
        app.$data.login.ok = false;
    }
})();
