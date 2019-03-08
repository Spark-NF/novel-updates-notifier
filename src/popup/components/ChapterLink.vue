<template>
    <span v-if="!url">{{ txt }}</span>
    <a :href="url" target="_blank" @click.prevent="openChapter(url, $event)" v-else>{{ txt }}</a>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { IReadingListResultChapter } from "../../common/NovelUpdatesClient";
import { Settings } from "../../common/Settings";

interface IBackground extends Window {
    settings: Settings;
}
const background = browser.extension.getBackgroundPage() as IBackground;

@Component
export default class ChapterLink extends Vue {
    @Prop() readonly chapter!: IReadingListResultChapter;

    get txt() { return this.chapter.html || this.chapter.name; }
    get url() { return this.chapter.url || (this.chapter.id && `https://www.novelupdates.com/extnu/${this.chapter.id}/`); }

    async openChapter(url: string, e: MouseEvent) {
        if (e.button !== 0 && e.button !== 1) {
            return;
        }

        e.preventDefault();
        const canSidebar = browser.sidebarAction !== undefined;
        const readInSidebar = background.settings.readInSidebar.get() && canSidebar;
        const middleClick = e.button === 1;

        // Open in a new tab
        if (middleClick || !readInSidebar) {
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
};
</script>