import Vue from "vue";
import { Settings } from "../common/Settings";
import { Storage } from "../common/Storage";
import { tr } from "../common/translate";
import Options from "../options/components/Options.vue";

Vue.filter("tr", tr);

const storage = new Storage();
const settings = new Settings(storage);

(async () => {
    await storage.init();
    await settings.preload();

    const app = new Options({
        el: "#app",
        propsData: { settings },
    });
})();
