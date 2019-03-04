import Vue from "vue";
import { IReadingList } from "../common/NovelUpdatesClient";
import { Settings } from "../common/Settings";

interface IBackground extends Window {
    readingLists: IReadingList[];
    settings: Settings;
}
const background = browser.extension.getBackgroundPage() as IBackground;

// Necessary to avoid adding observers everywhere
function clone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

(async () => {
    const app = new Vue({
        el: "#app",
        data: {
            groups: clone(await background.settings.groups.get()),
            lists: clone(background.readingLists),
        },
        methods: {
            addGroup() {
                this.groups.push({
                    name: "",
                    readingLists: [],
                });
            },
            async saveGroups() {
                await background.settings.groups.set(clone(this.groups));
            },
        },
    });
})();
