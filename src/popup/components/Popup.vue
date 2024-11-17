<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ICustomWindow } from "../../background/background";
import { IReadingListResult, IReadingListResultChapter, ISearchResult } from "../../common/NovelUpdatesClient";
import { secondsToString } from "../../common/time";
import { tr } from "../../common/translate";
import { IGroup, Settings } from "../../common/Settings";
import { clone } from "../../common/clone";
import OptionsGeneral from "../../options/components/OptionsGeneral.vue";
import OptionsGroups from "../../options/components/OptionsGroups.vue";
import NovelRow from "./NovelRow.vue";

const props = defineProps<{
    settings: Settings
}>();

const background = browser.extension.getBackgroundPage() as ICustomWindow;

let loadingMessage = ref(tr("loading"));
let login = reactive({
    ok: true,
    error: "",
    username: "",
    password: "",
});
let search = reactive({
    value: "",
    message: "",
    mode: props.settings.searchMode.get(),
    results: [],
});
let novels = reactive({
    ok: false,
    error: "",
    cloudflareError: false,
    nextRefresh: "",
    results: [],
    editing: undefined,
});
let settings = reactive({
    open: false,
    panel: "general",
    groups: clone(props.settings.groups.get()),
    readingLists: clone(background.readingLists),
    hasSidebar: browser.sidebarAction !== undefined,
    hasBadge: !!(browser.browserAction && browser.browserAction.setBadgeText),
    openInSidebar: props.settings.readInSidebar.get(),
});

function showLoader(msg: string): void {
    loadingMessage.value = msg;
}
function hideLoader(): void {
    showLoader("");
}

async function addNovel(url: string) {
    showLoader(tr("loadingGettingNovelId"));
    search.value = "";
    search.results = [];
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

    const interval = props.settings.interval.get();
    const secs = Math.max(0, Math.round((background.nextListRefresh.getTime() - new Date().getTime()) / 1000));
    novels.nextRefresh = secondsToString(secs, interval > 60);

    // Show network error
    novels.error = background.networkError;
    novels.cloudflareError = background.cloudflareError;
}
setInterval(updateRefreshLabel, 1000);

async function removeNovel(novel: IReadingListResult) {
    await background.client.removeFromList(novel.id);

    const index = novels.results.indexOf(novel);
    if (index !== -1) {
        novels.results.splice(index, 1);
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
    const readingList = await background.getReadingList();

    // Populate the table
    novels.results = readingList;

    updateRefreshLabel();
    hideLoader();

    novels.ok = true;
}

// Settings page
function openSettings() {
    settings.open = true;
}
function closeSettings() {
    settings.open = false;
}
function openGeneralSettings() {
    settings.panel = "general";
}
function openGroupsSettings() {
    settings.panel = "groups";
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
    if (search.mode !== "search") {
        search.results = [];
        return;
    }

    const val = search.value.trim();
    if (val === latestSearch) {
        return;
    }

    latestSearch = val;
    if (val.length === 0) {
        search.results = [];
    } else {
        search.message = tr("loadingResults");
        const results = await background.client.search(val);

        // If the current val is deprecated because the user kept typing, stop here
        if (val !== latestSearch) {
            return;
        }

        search.message = "";
        search.results = results.slice(0, 5);
    }
}

// Store credentials on login form submit
async function doLogin() {
    showLoader(tr("loginLoading"));

    if (await background.tryLogin(login.username, login.password)) {
        login.error = "";
        login.ok = true;

        showLoader(tr("loadingReadingList"));
        await background.reloadReadingList();
        await displayNovels();
    } else {
        login.error = tr("loginError");

        hideLoader();
    }

    return false;
}

async function saveGroups(groups: IGroup[]) {
    await props.settings.groups.set(clone(groups));
}

function setSearchMode(mode: string): void {
    search.mode = mode;
    props.settings.searchMode.set(mode); // Fire and forget
    doSearch();
}

// COMPUTED
const searchResults: ISearchResult[] = computed(() => {
    return search.mode === "search" ? search.results : [];
});
const filteredNovels: IReadingListResult[] = computed(() => {
    if (search.mode !== "filter") {
        return novels.results;
    }
    const filters: string[] = search.value.toLowerCase().split(" ");
    return novels.results.filter((n: IReadingListResult) => {
        const data = (n.name + " " + n.notes.tags).toLowerCase();
        return filters.every((f: string) => data.includes(f));
    });
});

// CREATED
onMounted(() => {
    props.settings.readInSidebar.addEventListener("change", () => {
        settings.openInSidebar = props.settings.readInSidebar.get();
    });

    // AFTER APP CREATE
    (async () => {
        if (await background.checkLoginStatus()) {
            showLoader(tr("loadingReadingList"));
            await displayNovels();
        } else {
            hideLoader();
            login.ok = false;
        }
    })();
})
</script>

<template>
    <div :class="{ 'no-overflow': loadingMessage || settings.open }">
        <div id="loader" class="overlay" v-if="loadingMessage">
            <div>
                <img src="../common/loading.gif" alt="" /><br/>
                <span>{{ loadingMessage }}</span>
            </div>
        </div>
        <div id="login-form" v-if="!login.ok">
            <form @submit.prevent="doLogin">
                <div class="block-body">
                    <p id="login-error" class="text-danger" v-if="login.error">{{ login.error }}</p>
                    <div class="form-group row">
                        <label for="username" class="col-4 col-form-label">{{ tr("loginUsername") }}</label>
                        <div class="col-8">
                            <input type="text" class="form-control" name="username" id="username" v-model="login.username" />
                        </div>
                    </div>
                    <div class="form-group row">
                        <label for="password" class="col-4 col-form-label">{{ tr("loginPassword") }}</label>
                        <div class="col-8">
                            <input type="password" class="form-control" name="password" id="password" v-model="login.password" />
                        </div>
                    </div>
                </div>
                <div class="block-footer">
                    <button type="submit" class="btn btn-primary"><i class="fa fa-sign-in"></i> {{ tr("loginButton") }}</button>
                </div>
            </form>
        </div>
        <div id="settings" class="overlay" v-if="settings.open">
            <div id="settings-groups" v-if="settings.panel === 'groups'">
                <div class="block-body">
                    <options-groups :groups="settings.groups" :reading-lists="settings.readingLists" @save-groups="saveGroups" />
                </div>
                <div class="block-footer">
                    <button class="btn btn-secondary float-end settings-back" @click="closeSettings"><i class="fa fa-chevron-circle-left"></i> {{ tr("settingsBack") }}</button>
                    <button class="btn btn-primary float-start" id="open-general-settings" @click="openGeneralSettings"><i class="fa fa-cogs"></i> {{ tr("settingsGeneral") }}</button>
                </div>
            </div>
            <div id="settings-general" v-if="settings.panel === 'general'">
                <div class="block-body">
                    <options-general :settings="props.settings" :has-sidebar="settings.hasSidebar" :has-badge="settings.hasBadge" />
                </div>
                <div class="block-footer">
                    <button class="btn btn-secondary float-end settings-back" @click="closeSettings"><i class="fa fa-chevron-circle-left"></i> {{ tr("settingsBack") }}</button>
                    <button class="btn btn-primary float-start" id="open-groups-settings" @click="openGroupsSettings"><i class="fa fa-list"></i> {{ tr("settingsGroups") }}</button>
                </div>
            </div>
        </div>
        <div id="error" v-if="novels.cloudflareError" style="padding: 20px 0">
            <div>
                <img src="../common/error.png" alt="Error" /><br/>
                <span>
                    Cloudflare challenge detected<br/><br/>
                    <a href="https://www.novelupdates.com/reading-list/" target="_blank" class="btn btn-success"><i class="fa fa-external-link"></i> {{ tr("buttonOpen") }} </a>
                    <button class="btn btn-info" @click="refreshNovels"><i class="fa fa-refresh"></i> {{ tr("buttonRefresh") }}</button>
                </span>
            </div>
        </div>
        <div id="novel-list" v-else-if="novels.ok">
            <div class="block-body">
                <div id="search">
                    <form>
                        <div class="form-group">
                            <div style="position:relative">
                                <input type="text" class="form-control" name="search" v-model="search.value" @input="doSearch" :placeholder="tr('searchPlaceholder')" />
                                <span style="position: absolute; right: 7px; top: 5px;">
                                    <div class="btn-group" role="group">
                                        <button type="button" class="btn btn-xs btn-icon" :class="{ 'btn-secondary': search.mode === 'filter', 'btn-outline-secondary': search.mode !== 'filter' }" @click="setSearchMode('filter')">
                                            <i class="fa fa-filter"></i>
                                        </button>
                                        <button type="button" class="btn btn-xs btn-icon" :class="{ 'btn-secondary': search.mode === 'search', 'btn-outline-secondary': search.mode !== 'search' }" @click="setSearchMode('search')">
                                            <i class="fa fa-search"></i>
                                        </button>
                                    </div>
                                </span>
                            </div>
                        </div>
                    </form>
                    <p v-if="search.message">{{ search.message }}</p>
                    <table id="search-results" class="table table-sm" v-if="searchResults && searchResults.length > 0">
                        <tbody>
                            <tr v-for="result in searchResults" :key="result.url">
                                <td class="novel-icon">
                                    <img :src="result.img" alt="" />
                                </td>
                                <td class="novel-name w-100">
                                    <a :href="result.url" target="_blank">
                                        {{ result.name }}
                                    </a>
                                </td>
                                <td>
                                    <button class="btn btn-xs btn-success btn-icon" @click="addNovel(result.url)">
                                        <i class="fa fa-plus"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <table id="novel-table" class="table table-sm">
                    <thead>
                        <tr>
                            <th>{{ tr("novelTableHeaderName") }}</th>
                            <th>{{ tr("novelTableHeaderRead") }}</th>
                            <th>{{ tr("novelTableHeaderNext") }}</th>
                            <th>{{ tr("novelTableHeaderLatest") }}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr is="vue:novel-row" v-for="novel of filteredNovels" v-on:mark-chapter-as-read="markChapterAsRead" v-on:remove-novel="removeNovel" :novel="novel" :open-in-sidebar="settings.hasSidebar && settings.openInSidebar" :key="novel.id"></tr>
                    </tbody>
                </table>
            </div>
            <div class="block-footer">
                <button id="open-settings" class="btn btn-secondary float-end" @click="openSettings"><i class="fa fa-cogs"></i> {{ tr("buttonSettings") }}</button>
                <a href="https://www.novelupdates.com/reading-list/" target="_blank" class="btn btn-success float-start me-1"><i class="fa fa-external-link"></i> {{ tr("buttonOpen") }}</a>
                <div class="d-flex align-items-center">
                    <button class="btn btn-info" @click="refreshNovels"><i class="fa fa-refresh"></i> {{ tr("buttonRefresh") }}</button>
                    <span class="ms-3 text-muted">{{ tr("nextRefresh", novels.nextRefresh) }}</span>
                    <span class="ms-2 text-warning" id="loading-error" :title="novels.error" v-if="novels.error"><i class="fa fa-exclamation-triangle"></i></span>
                </div>
            </div>
        </div>
    </div>
</template>