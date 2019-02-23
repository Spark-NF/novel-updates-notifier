import { Storage } from "./Storage";

export interface ISettings {
    interval: number;
    notifications: boolean;
    readInSidebar: boolean;
    customCss: boolean;
    autoMarkAsRead: boolean;
}

export class Settings {
    private storage: Storage;
    private settings: ISettings;

    constructor(storage: Storage) {
        this.storage = storage;
    }

    public async reload(): Promise<void> {
        const settings = await this.storage.getSync("settings") || {};

        this.settings = {
            interval: settings.interval || 5,
            notifications: settings.notifications === undefined ? true : settings.notifications,
            readInSidebar: settings.readInSidebar === undefined ? false : settings.readInSidebar,
            customCss: settings.customCss === undefined ? false : settings.customCss,
            autoMarkAsRead: settings.autoMarkAsRead === undefined ? false : settings.autoMarkAsRead,
        };
    }

    public async sync(): Promise<void> {
        await this.storage.setSync({ settings: this.settings });
    }

    public async getSettings(): Promise<ISettings> {
        if (!this.settings) {
            await this.reload();
        }
        return this.settings;
    }

    public async setSettings(values: { [key: string]: any }): Promise<void> {
        const settings = await this.getSettings();
        for (const key in values) {
            if (values.hasOwnProperty(key)) {
                (settings as any)[key] = values[key];
            }
        }
    }

    public async get<K extends keyof ISettings>(key: K): Promise<ISettings[K]> {
        const settings = await this.getSettings();
        return settings[key];
    }

    public async set<K extends keyof ISettings>(key: K, value: ISettings[K]): Promise<void> {
        const settings = await this.getSettings();
        settings[key] = value;
    }
}
