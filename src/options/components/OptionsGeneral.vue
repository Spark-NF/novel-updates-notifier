<template>
    <form>
        <div class="form-group row">
            <label for="interval" class="col-4 col-form-label">Interval</label>
            <div class="col-8 input-group">
                <input type="number" class="form-control" name="interval" id="interval" v-model="interval" />
                <div class="input-group-append">
                    <span class="input-group-text">minutes</span>
                </div>
            </div>
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="notifications" id="notifications" value="1" v-model="notifications" />
                <label class="form-check-label" for="notifications">Enable notifications</label>
            </div>
        </div>
        <div class="form-group" v-if="hasSidebar">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="read-in-sidebar" id="read-in-sidebar" value="1" v-model="readInSidebar" />
                <label class="form-check-label" for="read-in-sidebar">Open chapters in sidebar</label>
            </div>
        </div>
        <div class="form-group" v-if="hasSidebar">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="custom-css" id="custom-css" value="1" v-model="customCss" />
                <label class="form-check-label" for="custom-css">Use custom CSS in sidebar</label>
            </div>
        </div>
        <div class="form-group">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="auto-mark-as-read" id="auto-mark-as-read" value="1" v-model="autoMarkAsRead" />
                <label class="form-check-label" for="auto-mark-as-read">Automatically mark chapters as read</label>
            </div>
        </div>
        <div class="form-group" v-if="hasBadge">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" name="sum-unread-chapters" id="sum-unread-chapters" value="1" v-model="sumUnreadChapters" />
                <label class="form-check-label" for="sum-unread-chapters">Show total unread chapters in badge</label>
            </div>
        </div>
    </form>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { Settings } from "../../common/Settings";

@Component
export default class OptionsGeneral extends Vue {
    @Prop() readonly settings: Settings;
    @Prop() readonly hasSidebar: boolean;
    @Prop() readonly hasBadge: boolean;

    get interval(): number { return this.settings.interval.get(); }
    set interval(val: number) { this.settings.interval.set(val); }

    get notifications(): boolean { return this.settings.notifications.get(); }
    set notifications(val: boolean) { this.settings.notifications.set(val); }

    get readInSidebar(): boolean { return this.settings.readInSidebar.get(); }
    set readInSidebar(val: boolean) { this.settings.readInSidebar.set(val); }

    get customCss(): boolean { return this.settings.customCss.get(); }
    set customCss(val: boolean) { this.settings.customCss.set(val); }

    get autoMarkAsRead(): boolean { return this.settings.autoMarkAsRead.get(); }
    set autoMarkAsRead(val: boolean) { this.settings.autoMarkAsRead.set(val); }

    get sumUnreadChapters(): boolean { return this.settings.sumUnreadChapters.get(); }
    set sumUnreadChapters(val: boolean) { this.settings.sumUnreadChapters.set(val); }
};
</script>