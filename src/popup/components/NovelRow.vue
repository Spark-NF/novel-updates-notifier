<template>
    <tr :class="{ 'table-warning': hasNew && !novel.ignore, 'table-secondary': hasNew && novel.ignore }" :id="'novel-row-' + novel.id">
        <td class="novel-name">
            <a :href="novel.url" target="_blank">
                {{ novel.name }}
            </a>
            <span class="badge badge-primary" v-if="novel.nextLength > 0">
                {{ novel.nextLength }}
            </span>
        </td>
        <td class="novel-loading" colspan="4" v-if="loadingMessage">
            <img :src="'../common/loading.gif'" alt="" />
            {{ loadingMessage }}
        </td>
        <td class="novel-chapter" v-if="!loadingMessage">
            <chapter-link :chapter="novel.status" :open-in-sidebar="openInSidebar" v-if="!editing" />
            <input ref="readManual" type="text" :value="novel.status.name" :class="{ hidden: !editing }" v-if="novel.manual"  @change="changeCurrentChapterManual" @blur="changeCurrentChapterManual" />
            <select ref="readSelect" :class="{ hidden: !editing }" v-if="!novel.manual" @change="changeCurrentChapter" @blur="changeCurrentChapter">
                <option v-for="chapter of optChapters" :value="chapter.id" :selected="chapter.id === novel.status.id" :key="chapter.id">
                    {{ chapter.name }}
                </option>
            </select>
        </td>
        <td class="novel-chapter" v-if="!loadingMessage">
            <span v-if="novel.nextLength > 0">
                <chapter-link :chapter="novel.next" :open-in-sidebar="openInSidebar" />
            </span>
        </td>
        <td class="novel-chapter" v-if="!loadingMessage">
            <chapter-link :chapter="novel.latest" :open-in-sidebar="openInSidebar" />
        </td>
        <td class="novel-actions" v-if="!loadingMessage">
            <button class="btn btn-xs btn-icon btn-success" :title="'novelTableButtonMarkLastRead' | tr" @click="markLatestAsRead" v-if="hasNew && novel.status.id && novel.latest.id !== undefined && !novel.manual">
                <i class="fa fa-check"></i>
            </button>
            <button class="btn btn-xs btn-icon btn-warning" :title="'novelTableButtonEditManually' | tr" @click="startEdition" v-if="!editing">
                <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-xs btn-icon btn-danger" :title="'novelTableButtonRemove' | tr" @click="removeNovel(novel)">
                <i class="fa fa-trash-o"></i>
            </button>
        </td>
    </tr>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from "vue-property-decorator";
import { IReadingListResult, NovelUpdatesClient, IReadingListResultChapter } from "../../common/NovelUpdatesClient";
import { tr } from "../../common/translate";

interface IBackground extends Window {
    client: NovelUpdatesClient;
}
const background = browser.extension.getBackgroundPage() as IBackground;

@Component
export default class NovelRow extends Vue {
    @Prop() readonly novel!: IReadingListResult;
    @Prop() readonly openInSidebar!: boolean;

    editing = false;
    loadingMessage = "";
    optChapters: any = {};

    get hasNew(): boolean {
        return this.novel.nextLength > 0;
    }

    changeCurrentChapter() {
        if (!this.editing) {
            return;
        }
        this.editing = false;

        const readSelect = this.$refs.readSelect as HTMLSelectElement;
        const value = readSelect.value;
        const id = parseInt(value, 10);
        if (value !== "" && id !== this.novel.status.id) {
            const text = readSelect.selectedOptions[0].innerText;
            this.markChapterAsRead({ id, name: text }, this.novel);
        }
    }
    changeCurrentChapterManual() {
        if (!this.editing) {
            return;
        }
        this.editing = false;

        const readManual = this.$refs.readManual as HTMLInputElement;
        const value = readManual.value;
        if (value !== "" && value !== this.novel.status.name) {
            this.markChapterAsRead(value, this.novel);
        }
    }

    markLatestAsRead() {
        this.markChapterAsRead(this.novel.latest, this.novel);
    }

    markChapterAsRead(chapter: IReadingListResultChapter | string, novel: IReadingListResult) {
        this.loadingMessage = tr("loading");
        this.$emit("mark-chapter-as-read", chapter, novel, () => {
            this.loadingMessage = "";
        });
    }

    removeNovel(novel: IReadingListResult) {
        this.$emit("remove-novel", novel);
    }

    async startEdition() {
        const chapters = await background.client.getNovelChapters(this.novel);
        this.optChapters = this.hasNew && this.novel.status.id !== undefined && this.novel.nextLength > 0
            ? chapters.slice(chapters.map((c) => c.id).indexOf(this.novel.status.id))
            : chapters
        this.editing = true;

        if (this.novel.manual) {
            (this.$refs.readManual as HTMLInputElement).focus();
        } else {
            (this.$refs.readSelect as HTMLSelectElement).focus();
        }
    }
};
</script>