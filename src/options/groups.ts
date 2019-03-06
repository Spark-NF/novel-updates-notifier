import Vue from "vue";
import { IFilter } from "../common/Filter";
import { IReadingList } from "../common/NovelUpdatesClient";
import { IGroup, Settings } from "../common/Settings";

interface IBackground extends Window {
    readingLists: IReadingList[];
    settings: Settings;
}
const background = browser.extension.getBackgroundPage() as IBackground;

// Necessary to avoid adding observers everywhere
function clone(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
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
                    filters: [],
                });
            },
            removeGroup(group: IGroup) {
                this.groups.splice(this.groups.indexOf(group), 1);
            },
            addFilter(group: IGroup) {
                group.filters.push({
                    operator: "ge",
                    value: 1,
                    what: "unread",
                });
            },
            removeFilter(group: IGroup, filter: IFilter) {
                group.filters.splice(group.filters.indexOf(filter), 1);
            },
            async saveGroups() {
                await background.settings.groups.set(clone(this.groups));
            },
        },
    });
})();
