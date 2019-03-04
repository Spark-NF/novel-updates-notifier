// tslint:disable:max-line-length

import Vue from "vue";
import { IReadingListResult, IReadingListResultChapter, NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { Settings } from "../common/Settings";
import { secondsToString } from "../common/time";
import "./components/chapter-link";

interface IBackground extends Window {
    settings: Settings;
    client: NovelUpdatesClient;

    checkLoginStatus: (login?: boolean) => Promise<boolean>;
    getReadingList: () => Promise<IReadingListResult[]>;
    reloadReadingList: () => Promise<void>;
    tryLogin: (username: string, password: string) => Promise<boolean>;

    nextListRefresh?: Date;
    networkError?: string;
}

const background = browser.extension.getBackgroundPage() as IBackground;
let app: Vue;

Vue.component("novel", {
    props: ["novel"],
    data() {
        const hasNew = this.novel.next.length > 0;
        return {
            hasNew,
            editing: false,
            optChapters: hasNew && this.novel.status.id !== undefined && this.novel.next.length > 0
                ? [this.novel.status].concat(this.novel.next)
                : this.novel.chapters,
            readOverride: "",
        };
    },
    methods: {
        async changeCurrentChapter() {
            this.editing = false;

            const readSelect = this.$refs.readSelect as HTMLSelectElement;
            const value = readSelect.value;
            const id = parseInt(value, 10);
            if (value !== "" && id !== this.novel.status.id) {
                const text = readSelect.selectedOptions[0].innerText;
                await markChapterAsRead({ id, name: text }, this.novel);
            }
        },
        async markLatestAsRead() {
            await markChapterAsRead(this.novel.latest, this.novel);
        },
        removeNovel,
        startEdition() {
            this.editing = true;
            (this.$refs.readSelect as any).focus();
        },
    },
    template: `
        <tr v-bind:class="{ 'table-warning': hasNew }" v-bind:id="'novel-row-' + novel.id">
            <td class="novel-name">
                <a v-bind:href="novel.url" target="_blank">
                    {{ novel.name }}
                </a>
                <span class="badge badge-primary" v-if="novel.next.length > 0">
                    {{ novel.next.length }}
                </span>
            </td>
            <td class="novel-chapter">
                <chapter-link v-bind:chapter="novel.status" v-if="!editing" />
                <select ref="readSelect" v-if="editing" v-on:change="changeCurrentChapter(this, novel)" v-on:blur="changeCurrentChapter(this, novel)">
                    <option v-for="chapter of optChapters" v-bind:value="chapter.id" v-bind:selected="chapter.id === novel.status.id">
                        {{ chapter.name }}
                    </option>
                </select>
            </td>
            <td class="novel-chapter">
                <span v-if="novel.next.length > 0">
                    <chapter-link v-bind:chapter="novel.next[0]" />
                </span>
            </td>
            <td class="novel-chapter">
                <chapter-link v-bind:chapter="novel.latest" />
            </td>
            <td class="novel-actions">
                <span class="btn btn-xs btn-icon text-warning" title="Edition is disabled because your current chapter could not be mapped to an existing chapter" v-if="!novel.status.id">
                    <i class="fa fa-exclamation-triangle"></i>
                </span>
                <template v-else>
                    <button class="btn btn-xs btn-icon btn-success" title="Mark last chapter as read" v-on:click="markLatestAsRead" v-id="hasNew && novel.latest.id !== undefined">
                        <i class="fa fa-check"></i>
                    </button>
                    <button class="btn btn-xs btn-icon btn-warning" title="Edit last read chapter manually" v-on:click="startEdition" v-if="!editing">
                        <i class="fa fa-pencil"></i>
                    </button>
                </template>
                <button class="btn btn-xs btn-icon btn-danger" title="Remove novel from reading list" v-on:click="removeNovel(novel)">
                    <i class="fa fa-trash-o"></i>
                </button>
            </td>
        </tr>
    `,
});

function showLoader(msg: string): void {
    app.$data.loadingMessage = msg;
}
function hideLoader(): void {
    showLoader("");
}

async function removeNovel(novel: IReadingListResult) {
    await background.client.removeFromList(novel.id);

    const index = app.$data.novels.results.indexOf(novel);
    if (index !== -1) {
        app.$data.novels.results.splice(index, 1);
    }
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

    const interval = await background.settings.interval.get();
    const secs = Math.max(0, Math.round((background.nextListRefresh.getTime() - new Date().getTime()) / 1000));
    app.$data.novels.nextRefresh = secondsToString(secs, interval > 60);

    // Show network error
    app.$data.novels.error = background.networkError;
}
setInterval(updateRefreshLabel, 1000);

async function changeCurrentChapterr(value: string, text: string, novel: IReadingListResult) {
    const newId = parseInt(value, 10);
    const hasChanged = value !== "" && newId !== novel.status.id;
    if (hasChanged) {
        showLoader("Applying change...");

        await background.client.markChapterRead(novel.id, newId);
        if (novel.manual !== undefined) {
            await background.client.markChapterReadManual(novel.id, novel.manual, text);
        }
    }

    return hasChanged;
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
