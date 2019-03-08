import Vue from "vue";
import { Settings } from "../common/Settings";
import OptionsGeneral from "../options/components/OptionsGeneral.vue";

Vue.component("options-general", OptionsGeneral);

interface IBackground extends Window {
    settings: Settings;
}
const background = browser.extension.getBackgroundPage() as IBackground;

const app = new Vue({
    el: "#app",
    data: {
        settings: background.settings,
        hasSidebar: !!browser.sidebarAction,
    },
});
