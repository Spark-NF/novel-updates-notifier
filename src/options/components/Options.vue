<template>
    <options-general :settings="settings" :has-sidebar="hasSidebar" :has-badge="hasBadge" />
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Settings } from "../../common/Settings";
import OptionsGeneral from "./OptionsGeneral.vue";

@Component({
    components: { OptionsGeneral }
})
export default class Options extends Vue {
    @Prop() settings: Settings;

    public hasSidebar: boolean;
    public hasBadge: boolean;

    constructor(opts: any) {
        super();

        this.hasSidebar = browser.sidebarAction !== undefined;
        this.hasBadge = !!(browser.browserAction && browser.browserAction.setBadgeText);
    }
};
</script>