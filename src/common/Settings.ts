import { Setting } from "./Setting";
import { Storage } from "./Storage";

export class Settings {
    public interval: Setting<number>;
    public notifications: Setting<boolean>;
    public readInSidebar: Setting<boolean>;
    public customCss: Setting<boolean>;
    public autoMarkAsRead: Setting<boolean>;

    constructor(storage: Storage) {
        this.interval = new Setting<number>(storage, "interval", 5);
        this.notifications = new Setting<boolean>(storage, "notifications", true);
        this.readInSidebar = new Setting<boolean>(storage, "readInSidebar", false);
        this.customCss = new Setting<boolean>(storage, "customCss", false);
        this.autoMarkAsRead = new Setting<boolean>(storage, "autoMarkAsRead", false);
    }
}
