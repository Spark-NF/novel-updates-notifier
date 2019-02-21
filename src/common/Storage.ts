type StorageArea = browser.storage.StorageArea;

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
    private sync: StorageArea;
    private local: StorageArea;
    private settings: ISettings;

    public async init(sync?: StorageArea, local?: StorageArea): Promise<void> {
        this.sync = sync || await this.getStorage();
        this.local = local || browser.storage.local;
        await this.reloadSettings();
    }

    // Return the sync storage with fallback on local one
    private async getStorage(): Promise<StorageArea> {
        try {
            if (await browser.storage.sync.get(null)) {
                return browser.storage.sync;
            }
        } catch (e) { /* ignore */ }
        return browser.storage.local;
    }

    private async get(storage: StorageArea, key: string): Promise<any> {
        const raw = await storage.get(key) || {};
        return key in raw ? raw[key] : undefined;
    }

    private async reloadSettings(): Promise<void> {
        const settings = await this.get(this.sync, "settings") || {};
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
        await this.sync.set({ settings: this.settings });
        await this.reloadSettings();
    }

    public async setCache(key: string, value: any, duration: number): Promise<void> {
        const values: { [key: string]: ICacheData } = {};
        values["cache_" + key] = {
            value,
            expiration: new Date().getTime() + duration,
        };
        await this.local.set(values);
    }

    public async getCache(key: string): Promise<any> {
        const data: ICacheData = await this.get(this.local, "cache_" + key);
        if (data && data.expiration > new Date().getTime()) {
            return data.value;
        }
        return undefined;
    }
}
