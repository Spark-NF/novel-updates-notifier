export interface ISettings {
    interval: number;
    notifications: boolean;
    readInSidebar: boolean;
    customCss: boolean;
    autoMarkAsRead: boolean;
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

    private async reloadSettings(): Promise<void> {
        const settings = await this.storage.get(undefined) || {};
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
        await this.storage.set(values);
        await this.reloadSettings();
    }
}
