import Vue from "vue";
import { IReadingList } from "../common/NovelUpdatesClient";

interface IBackground extends Window {
    readingLists: IReadingList[];
}
const background = browser.extension.getBackgroundPage() as IBackground;

(async () => {
    const app = new Vue({
        el: "#app",
        data: {
            groups: JSON.parse(localStorage.getItem("groups")) || [],
            lists: background.readingLists,
        },
        methods: {
            addGroup() {
                this.groups.push({
                    name: "",
                    lists: [],
                });
            },
            saveGroups() {
                localStorage.setItem("groups", JSON.stringify(this.groups));
            },
        },
    });
})();
