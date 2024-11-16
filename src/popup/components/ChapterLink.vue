<script setup lang="ts">
import { IReadingListResultChapter } from "../../common/NovelUpdatesClient";

const props = defineProps<{
    chapter: IReadingListResultChapter
    openInSidebar: boolean
}>();

const txt = props.chapter.html || props.chapter.name;
const url = props.chapter.url || (props.chapter.id && `https://www.novelupdates.com/extnu/${props.chapter.id}/`);

async function openChapter(url: string, e: MouseEvent) {
    if (e.button !== 0 && e.button !== 1) {
        return;
    }

    e.preventDefault();
    const middleClick = e.button === 1;

    // Open in a new tab
    if (middleClick || !props.openInSidebar) {
        await browser.tabs.create({
            active: !middleClick,
            url,
        });
        return false;
    }

    // Open in sidebar
    await browser.sidebarAction.open();
    await browser.sidebarAction.setPanel({ panel: url });
}
</script>

<template>
    <span v-if="!url">{{ txt }}</span>
    <a :href="url" target="_blank" @click.prevent="openChapter(url, $event)" v-else v-html="txt"></a>
</template>