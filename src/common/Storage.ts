export interface ISettings {
    interval: number;
    notifications: boolean;
    readInSidebar: boolean;
    customCss: boolean;
    autoMarkAsRead: boolean;
}

interface ICacheData {
    value: any;
    expiration: number;
}

export class Storage {
    private storage: browser.storage.StorageArea;
    private settings: ISettings;

    public async init(): Promise<void> {
        this.storage = await this.getStorage();
        await this.reloadSettings();
    }

    // Return the sync storage with fallback on local one
    private async getStorage(): Promise<browser.storage.StorageArea> {
        try {
            if (await browser.storage.sync.get(null)) {
                return browser.storage.sync;
            }
        } catch (e) { /* ignore */ }
        return browser.storage.local;
    }

    private async get(key: string): Promise<any> {
        const raw = await this.storage.get(key) || {};
        return key in raw ? raw[key] : undefined;
    }

    private async reloadSettings(): Promise<void> {
        const settings = await this.get("settings") || {};
        this.settings = {
            interval: settings.interval || 5,
            notifications: settings.notifications === undefined ? true : settings.notifications,
            readInSidebar: settings.readInSidebar === undefined ? false : settings.readInSidebar,
            customCss: settings.customCss === undefined ? false : settings.customCss,
            autoMarkAsRead: settings.autoMarkAsRead === undefined ? false : settings.autoMarkAsRead,
        };
    }

    public async getSettings(): Promise<ISettings> {
        return this.settings;
    }

    public async getSetting<K extends keyof ISettings>(key: K): Promise<ISettings[K]> {
        const settings = await this.getSettings();
        return settings[key];
    }

    public async setSettings(values: { [key: string]: any }): Promise<void> {
        for (const key in values) {
            if (values.hasOwnProperty(key)) {
                (this.settings as any)[key] = values[key];
            }
        }
        await this.storage.set({ settings: this.settings });
        await this.reloadSettings();
    }

    public async setCache(key: string, value: any, duration: number): Promise<void> {
        const values: { [key: string]: ICacheData } = {};
        values["cache_" + key] = {
            value,
            expiration: new Date().getTime() + duration,
        };
        await this.storage.set(values);
    }

    public async getCache(key: string): Promise<any> {
        const data: ICacheData = await this.get("cache_" + key);
        if (data && data.expiration > new Date().getTime()) {
            return data.value;
        }
        return undefined;
    }
}
