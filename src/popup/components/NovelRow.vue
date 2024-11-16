<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { IReadingListResult, NovelUpdatesClient, IReadingListResultChapter } from "../../common/NovelUpdatesClient";
import { tr } from "../../common/translate";
import ChapterLink from "./ChapterLink.vue"

interface IBackground extends Window {
    client: NovelUpdatesClient;
}
const background = browser.extension.getBackgroundPage() as IBackground;

const props = defineProps<{
    novel: IReadingListResult
    openInSidebar: boolean
}>();
const emit = defineEmits([
    "mark-chapter-as-read",
    "remove-novel",
]);

let editing = ref(false);
let loadingMessage = ref("");
let optChapters: any = ref({});

const readSelectRef = useTemplateRef<HTMLSelectElement>("readSelect");
const readManualRef = useTemplateRef<HTMLInputElement>("readManual");

const hasNew: boolean  = props.novel.nextLength > 0;

function changeCurrentChapter() {
    if (!editing) {
        return;
    }
    editing.value = false;

    const readSelect = readSelectRef.value;
    if (readSelect) {
        const value = readSelect.value;
        const id = parseInt(value, 10);
        if (value !== "" && id !== props.novel.status.id) {
            const text = readSelect.selectedOptions[0].innerText;
            markChapterAsRead({ id, name: text }, props.novel);
        }
    }
}
function changeCurrentChapterManual({...p}) {
    if (!editing) {
        return;
    }
    editing.value = false;

    const readManual = readManualRef.value;
    if (readManual) {
        const value = readManual.value;
        if (value !== "" && value !== props.novel.status.name) {
            markChapterAsRead(value, props.novel);
        }
    }
}

function markLatestAsRead() {
    markChapterAsRead(props.novel.latest, props.novel);
}

function markChapterAsRead(chapter: IReadingListResultChapter | string, novel: IReadingListResult) {
    loadingMessage.value = tr("loading");
    emit("mark-chapter-as-read", chapter, novel, () => {
        loadingMessage.value = "";
    });
}

function removeNovel(novel: IReadingListResult) {
    emit("remove-novel", novel);
}

async function startEdition() {
    const chapters = await background.client.getNovelChapters(props.novel);
    console.log("chapters", props.novel.id, chapters);
    optChapters.value = hasNew && props.novel.status.id !== undefined && props.novel.nextLength > 0
        ? chapters.slice(chapters.map((c) => c.id).indexOf(props.novel.status.id))
        : chapters
    editing.value = true;

    if (props.novel.manual) {
        readManualRef.value!.focus();
    } else {
        readSelectRef.value!.focus();
    }
}
</script>

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
            <img src="../../common/loading.gif" alt="" />
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
            <button class="btn btn-xs btn-icon btn-success" :title="tr('novelTableButtonMarkLastRead')" @click="markLatestAsRead" v-if="hasNew && novel.status.id && novel.latest.id !== undefined && !novel.manual">
                <i class="fa fa-check"></i>
            </button>
            <button class="btn btn-xs btn-icon btn-warning" :title="tr('novelTableButtonEditManually')" @click="startEdition" v-if="!editing">
                <i class="fa fa-pencil"></i>
            </button>
            <button class="btn btn-xs btn-icon btn-danger" :title="tr('novelTableButtonRemove')" @click="removeNovel(novel)">
                <i class="fa fa-trash-o"></i>
            </button>
        </td>
    </tr>
</template>