import { Settings } from "../common/Settings";
import { Storage } from "../common/Storage";
import Options from "../options/components/Options.vue";

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
