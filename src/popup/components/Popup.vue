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
                        <label for="username" class="col-4 col-form-label">{{ "loginUsername" | tr }}</label>
                        <div class="col-8">
                            <input type="text" class="form-control" name="username" id="username" v-model="login.username" />
                        </div>
                    </div>
                    <div class="form-group row">
                        <label for="password" class="col-4 col-form-label">{{ "loginPassword" | tr }}</label>
                        <div class="col-8">
                            <input type="password" class="form-control" name="password" id="password" v-model="login.password" />
                        </div>
                    </div>
                </div>
                <div class="block-footer">
                    <button type="submit" class="btn btn-primary"><i class="fa fa-sign-in"></i> {{ "loginButton" | tr }}</button>
                </div>
            </form>
        </div>
        <div id="settings" class="overlay" v-if="settings.open">
            <div id="settings-groups" v-if="settings.panel === 'groups'">
                <div class="block-body">
                    <options-groups :groups="settings.groups" :reading-lists="settings.readingLists" @save-groups="saveGroups" />
                </div>
                <div class="block-footer">
                    <button class="btn btn-secondary float-right settings-back" @click="closeSettings"><i class="fa fa-chevron-circle-left"></i> {{ "settingsBack" | tr }}</button>
                    <button class="btn btn-primary float-left" id="open-general-settings" @click="openGeneralSettings"><i class="fa fa-cogs"></i> {{ "settingsGeneral" | tr }}</button>
                </div>
            </div>
            <div id="settings-general" v-if="settings.panel === 'general'">
                <div class="block-body">
                    <options-general :settings="settingsObj" :has-sidebar="settings.hasSidebar" :has-badge="settings.hasBadge" />
                </div>
                <div class="block-footer">
                    <button class="btn btn-secondary float-right settings-back" @click="closeSettings"><i class="fa fa-chevron-circle-left"></i> {{ "settingsBack" | tr }}</button>
                    <button class="btn btn-primary float-left" id="open-groups-settings" @click="openGroupsSettings"><i class="fa fa-list"></i> {{ "settingsGroups" | tr }}</button>
                </div>
            </div>
        </div>
        <div id="novel-list" v-if="novels.ok">
            <div class="block-body">
                <div id="search">
                    <form>
                        <div class="form-group">
                            <div style="position:relative">
                                <input type="text" class="form-control" name="search" v-model="search.value" @input="doSearch" :placeholder="'searchPlaceholder' | tr" />
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
                        <tr v-for="result in searchResults" :key="result.url">
                            <td class="novel-icon" style="width: 0%">
                                <img :src="result.img" alt="" />
                            </td>
                            <td class="novel-name">
                                <a :href="result.url" target="_blank">
                                    {{ result.name }}
                                </a>
                            </td>
                            <td style="width: 0%">
                                <button class="btn btn-xs btn-success btn-icon" @click="addNovel(result.url)">
                                    <i class="fa fa-plus"></i>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <table id="novel-table" class="table table-sm">
                    <thead>
                        <tr>
                            <th>{{ "novelTableHeaderName" | tr }}</th>
                            <th>{{ "novelTableHeaderRead" | tr }}</th>
                            <th>{{ "novelTableHeaderNext" | tr }}</th>
                            <th>{{ "novelTableHeaderLatest" | tr }}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr is="novel-row" v-for="novel of filteredNovels" v-on:mark-chapter-as-read="markChapterAsRead" v-on:remove-novel="removeNovel" :novel="novel" :open-in-sidebar="settings.hasSidebar && settings.openInSidebar" :key="novel.id"></tr>
                    </tbody>
                </table>
            </div>
            <div class="block-footer">
                <button id="open-settings" class="btn btn-secondary float-right" @click="openSettings"><i class="fa fa-cogs"></i> {{ "buttonSettings" | tr }}</button>
                <a href="https://www.novelupdates.com/reading-list/" target="_blank" class="btn btn-success float-left mr-1"><i class="fa fa-external-link"></i> {{ "buttonOpen" | tr }}</a>
                <div class="d-flex align-items-center">
                    <button id="refresh-novel-list" class="btn btn-info" @click="refreshNovels"><i class="fa fa-refresh"></i> {{ "buttonRefresh" | tr }}</button>
                    <span class="ml-3 text-muted">{{ "nextRefresh" | tr(novels.nextRefresh) }}</span>
                    <span class="ml-2 text-warning" id="loading-error" :title="novels.error" v-if="novels.error"><i class="fa fa-exclamation-triangle"></i></span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class Popup extends Vue {}
</script>