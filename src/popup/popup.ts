import { createApp } from "vue";
import { Settings } from "../common/Settings";
import { Storage } from "../common/Storage";
import { tr } from "../common/translate";
import Popup from "./components/Popup.vue";

const storage = new Storage();
const settings = new Settings(storage);

(async () => {
    await storage.init();
    await settings.preload();

    const app = createApp(Popup, { settings });
    app.config.globalProperties.tr = tr;
    app.mount("#app");
})();
