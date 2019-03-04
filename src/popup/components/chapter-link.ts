import Vue from "vue";
import { Settings } from "../../common/Settings";

interface IBackground extends Window {
    settings: Settings;
}
const background = browser.extension.getBackgroundPage() as IBackground;

Vue.component("chapter-link", {
    props: ["chapter"],
    data() {
        return {
            txt: this.chapter.html || this.chapter.name,
            url: this.chapter.url || (this.chapter.id && `https://www.novelupdates.com/extnu/${this.chapter.id}/`),
        };
    },
    methods: {
        openChapter,
    },
    template: `
        <span v-if="!url">{{ txt }}</span>
        <a :href="url" target="_blank" @click.prevent="openChapter(url, $event)" v-else>{{ txt }}</a>
    `,
});

async function openChapter(url: string, e: MouseEvent) {
    if (e.button !== 0 && e.button !== 1) {
        return;
    }

    e.preventDefault();
    const canSidebar = browser.sidebarAction !== undefined;
    const readInSidebar = await background.settings.readInSidebar.get() && canSidebar;
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
