<template>
    <form>
        <div class="novel-group" v-for="(group, gIndex) in groups" :key="gIndex">
            <div class="form-group row">
                <label for="name" class="col-4 col-form-label">Name</label>
                <div class="col-8 input-group">
                    <input type="text" class="form-control" name="name" id="name" v-model="group.name" />
                    <div class="input-group-append">
                        <button type="button" class="btn btn-danger" title="Delete this group" @click.prevent="removeGroup(group)">
                            <i class="fa fa-trash-o"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="form-group row">
                <label for="ignore" class="col-4 col-form-label">Ignore</label>
                <div class="col-8 input-group">
                    <input type="checkbox" name="ignore" id="ignore" value="1" v-model="group.ignore" />
                </div>
            </div>
            <div class="form-group row">
                <label for="lists" class="col-4 col-form-label">Lists</label>
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
                    <button class="btn btn-success btn-xs btn-icon float-right" title="Add new filter" @click.prevent="addFilter(group)">
                        <i class="fa fa-plus"></i>
                    </button>
                    Filters
                </label>
                <div class="col-8">
                    <p class="text-muted mb-0 mt-2" v-if="group.filters.length === 0">
                        This group does not have any filter set.
                    </p>
                    <div class="input-group mb-1" v-for="(filter, fIndex) in group.filters" :key="fIndex">
                        <div class="input-group-prepend">
                            <select class="form-control" v-model="filter.operator">
                                <option value="gt">&gt;</option>
                                <option value="ge">&ge;</option>
                                <option value="eq">=</option>
                                <option value="le">&le;</option>
                                <option value="lt">&lt;</option>
                            </select>
                        </div>
                        <input type="number" class="form-control" v-model.number="filter.value" />
                        <div class="input-group-append">
                            <select class="form-control rounded-0" v-model="filter.what">
                                <option value="unread">Unread chapters</option>
                                <option value="days_since_first_unread">Days since first unread</option>
                                <option value="days_since_latest">Days since latest</option>
                            </select>
                            <button type="button" class="btn btn-danger" title="Delete this group" @click.prevent="removeFilter(group, filter)">
                                <i class="fa fa-trash-o"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <button type="button" class="btn btn-success" @click.prevent="addGroup"><i class="fa fa-plus"></i> Add</button>
        <button type="button" class="btn btn-primary" @click.prevent="saveGroups"><i class="fa fa-save"></i> Save</button>
    </form>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from "vue-property-decorator";
import { clone } from "../../common/clone";
import { IFilter } from "../../common/Filter";
import { IReadingList } from "../../common/NovelUpdatesClient";
import { IGroup } from "../../common/Settings";

@Component
export default class OptionsGroups extends Vue {
    @Prop() groups: IGroup[];
    @Prop() readingLists: IReadingList[];

    addGroup() {
        this.groups.push({
            name: "",
            readingLists: [],
            filters: [],
        });
    }

    removeGroup(group: IGroup) {
        this.groups.splice(this.groups.indexOf(group), 1);
    }

    addFilter(group: IGroup) {
        group.filters.push({
            operator: "ge",
            value: 1,
            what: "unread",
        });
    }

    removeFilter(group: IGroup, filter: IFilter) {
        group.filters.splice(group.filters.indexOf(filter), 1);
    }

    saveGroups() {
        this.$emit("save-groups", clone(this.groups));
    }
};
</script>