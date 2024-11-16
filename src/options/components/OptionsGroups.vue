<script setup lang="ts">
import { clone } from "../../common/clone";
import { IFilter } from "../../common/Filter";
import { IReadingList } from "../../common/NovelUpdatesClient";
import { IGroup } from "../../common/Settings";

const props = defineProps<{
    groups: IGroup[]
    readingLists: IReadingList[]
}>();
const emit = defineEmits([
    "save-groups",
]);

function addGroup() {
    props.groups.push({
        name: "",
        readingLists: [],
        filters: [],
    });
}

function removeGroup(group: IGroup) {
    props.groups.splice(props.groups.indexOf(group), 1);
}

function addFilter(group: IGroup) {
    group.filters.push({
        operator: "ge",
        value: 1,
        what: "unread",
    });
}

function removeFilter(group: IGroup, filter: IFilter) {
    group.filters.splice(group.filters.indexOf(filter), 1);
}

function saveGroups() {
    emit("save-groups", clone(props.groups));
}
</script>

<template>
    <form>
        <div class="novel-group" v-for="(group, gIndex) in groups" :key="gIndex">
            <div class="form-group row">
                <label for="name" class="col-4 col-form-label">{{ tr("settingGroupName") }}</label>
                <div class="col-8">
                    <div class="input-group">
                        <input type="text" class="form-control" name="name" id="name" v-model="group.name" />
                        <button type="button" class="btn btn-danger" :title="tr('settingGroupDelete')" @click.prevent="removeGroup(group)">
                            <i class="fa fa-trash-o"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="form-group row">
                <label for="ignore" class="col-4 col-form-label">{{ tr("settingGroupIgnore") }}</label>
                <div class="col-8">
                    <div class="form-check col-form-label">
                        <input type="checkbox" class="form-check-input" name="ignore" id="ignore" value="1" v-model="group.ignore" />
                    </div>
                </div>
            </div>
            <div class="form-group row">
                <label for="lists" class="col-4 col-form-label">{{ tr("settingGroupLists") }}</label>
                <div class="col-8">
                    <select name="lists" class="form-control" id="lists" v-model="group.readingLists" multiple>
                        <option v-for="list in readingLists" :value="list.id" :key="list.IReadingList">
                            {{ list.name }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="form-group row">
                <label for="lists" class="col-4 col-form-label">
                    <button class="btn btn-success btn-xs btn-icon float-end" :title="tr('settingGroupFilterAdd')" @click.prevent="addFilter(group)">
                        <i class="fa fa-plus"></i>
                    </button>
                    {{ tr("settingGroupFilters") }}
                </label>
                <div class="col-8">
                    <p class="text-muted mb-0 mt-2" v-if="group.filters.length === 0">
                        {{ tr("settingGroupFilterEmpty") }}
                    </p>
                    <div class="input-group mb-1" v-for="(filter, fIndex) in group.filters" :key="fIndex">
                        <select class="form-select operator-select" v-model="filter.operator">
                            <option value="gt">&gt;</option>
                            <option value="ge">&ge;</option>
                            <option value="eq">=</option>
                            <option value="le">&le;</option>
                            <option value="lt">&lt;</option>
                        </select>
                        <input type="number" class="form-control" v-model.number="filter.value" />
                        <select class="form-select" v-model="filter.what">
                            <option value="unread">{{ tr("settingGroupFilterVariableUnread") }}</option>
                            <option value="days_since_first_unread">{{ tr("settingGroupFilterVariableDays") }}</option>
                            <option value="days_since_latest">{{ tr("settingGroupFilterVariableLatest") }}</option>
                        </select>
                        <button type="button" class="btn btn-danger" :title="tr('settingGroupFilterVariableDelete')" @click.prevent="removeFilter(group, filter)">
                            <i class="fa fa-trash-o"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <button type="button" class="btn btn-success" @click.prevent="addGroup"><i class="fa fa-plus"></i> {{ tr("settingGroupAdd") }}</button>
        <button type="button" class="btn btn-primary" @click.prevent="saveGroups"><i class="fa fa-save"></i> {{ tr("settingGroupSave") }}</button>
    </form>
</template>