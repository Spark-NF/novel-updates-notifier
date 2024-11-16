<script setup lang="ts">
import { computed } from "vue"
import { Settings } from "../../common/Settings";

const props = defineProps<{
    settings: Settings
    hasSidebar: boolean
    hasBadge: boolean
}>();

const interval = computed({
    get() { return props.settings.interval.get() },
    set(val: number) { props.settings.interval.set(val) },
});
const notifications = computed({
    get() { return props.settings.notifications.get() },
    set(val: boolean) { props.settings.notifications.set(val) },
});
const readInSidebar = computed({
    get() { return props.settings.readInSidebar.get() },
    set(val: boolean) { props.settings.readInSidebar.set(val) },
});
const customCss = computed({
    get() { return props.settings.customCss.get() },
    set(val: boolean) { props.settings.customCss.set(val) },
});
const autoMarkAsRead = computed({
    get() { return props.settings.autoMarkAsRead.get() },
    set(val: boolean) { props.settings.autoMarkAsRead.set(val) },
});
const sumUnreadChapters = computed({
    get() { return props.settings.sumUnreadChapters.get() },
    set(val: boolean) { props.settings.sumUnreadChapters.set(val) },
});
</script>

<template>
    <form>
        <div class="form-group row">
            <label for="interval" class="col-4 col-form-label">{{ tr("settingInterval") }}</label>
            <div class="col-8 input-group">
                <input type="number" class="form-control" name="interval" id="interval" v-model="interval" />
                <div class="input-group-append">
                    <span class="input-group-text">{{ tr("settingIntervalSuffix") }}</span>
                </div>
            </div>
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="notifications" id="notifications" value="1" v-model="notifications" />
                <label class="form-check-label" for="notifications">{{ tr("settingNotifications") }}</label>
            </div>
        </div>
        <div class="form-group" v-if="hasSidebar">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="read-in-sidebar" id="read-in-sidebar" value="1" v-model="readInSidebar" />
                <label class="form-check-label" for="read-in-sidebar">{{ tr("settingSidebar") }}</label>
            </div>
        </div>
        <div class="form-group" v-if="hasSidebar">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="custom-css" id="custom-css" value="1" v-model="customCss" />
                <label class="form-check-label" for="custom-css">{{ tr("settingSidebarCss") }}</label>
            </div>
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="auto-mark-as-read" id="auto-mark-as-read" value="1" v-model="autoMarkAsRead" />
                <label class="form-check-label" for="auto-mark-as-read">{{ tr("settingMarkRead") }}</label>
            </div>
        </div>
        <div class="form-group" v-if="hasBadge">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="sum-unread-chapters" id="sum-unread-chapters" value="1" v-model="sumUnreadChapters" />
                <label class="form-check-label" for="sum-unread-chapters">{{ tr("settingSumUnread") }}</label>
            </div>
        </div>
    </form>
</template>