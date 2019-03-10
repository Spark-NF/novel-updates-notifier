import Vue from "vue";
import { Settings } from "../common/Settings";
import { Storage } from "../common/Storage";
import OptionsGeneral from "../options/components/OptionsGeneral.vue";

Vue.component("options-general", OptionsGeneral);

const storage = new Storage();
const settings = new Settings(storage);

(async () => {
    await storage.init();
    await settings.preload();

    const app = new Vue({
        el: "#app",
        data: {
            hasSidebar: browser.sidebarAction !== undefined,
        },
        computed: {
            settings(): Settings {
                return settings;
            },
        },
    });
})();
