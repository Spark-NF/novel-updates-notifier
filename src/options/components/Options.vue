<script setup lang="ts">
import OptionsGeneral from "./OptionsGeneral.vue";
import { Settings } from "../../common/Settings";

const props = defineProps<{
    settings: Settings
}>();

const hasSidebar = browser.sidebarAction !== undefined;
const hasBadge = !!(browser.browserAction && browser.browserAction.setBadgeText);
</script>

<template>
    <options-general :settings="props.settings" :has-sidebar="hasSidebar" :has-badge="hasBadge" />
</template>