import { IFilter } from "./Filter";
import { Setting } from "./Setting";
import { Storage } from "./Storage";

export interface IGroup {
    name: string;
    readingLists: number[];
    filters: IFilter[];
}

export class Settings {
    public interval: Setting<number>;
    public notifications: Setting<boolean>;
    public readInSidebar: Setting<boolean>;
    public customCss: Setting<boolean>;
    public autoMarkAsRead: Setting<boolean>;
    public groups: Setting<IGroup[]>;

    constructor(storage: Storage) {
        this.interval = new Setting<number>(storage, "interval", 5);
        this.notifications = new Setting<boolean>(storage, "notifications", true);
        this.readInSidebar = new Setting<boolean>(storage, "readInSidebar", false);
        this.customCss = new Setting<boolean>(storage, "customCss", false);
        this.autoMarkAsRead = new Setting<boolean>(storage, "autoMarkAsRead", false);
        this.groups = new Setting<IGroup[]>(storage, "groups", []);
    }

    public async preload(): Promise<void> {
        await this.interval.preload();
        await this.notifications.preload();
        await this.readInSidebar.preload();
        await this.customCss.preload();
        await this.autoMarkAsRead.preload();
        await this.groups.preload();
    }
}
