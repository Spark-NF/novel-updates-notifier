type StorageArea = browser.storage.StorageArea;

interface ICacheData {
    value: any;
    expiration: number;
}

export class Storage {
    private sync?: StorageArea;
    private local?: StorageArea;

    public async init(sync?: StorageArea, local?: StorageArea): Promise<void> {
        this.sync = sync || await this.getStorage();
        this.local = local || browser.storage.local;
    }

    // Return the sync storage with fallback on local one
    private async getStorage(): Promise<StorageArea> {
        try {
            if (await browser.storage.sync.get(undefined)) {
                return browser.storage.sync;
            }
        } catch { /* ignore */ }
        return browser.storage.local;
    }

    private async get(storage: StorageArea, key: string): Promise<any> {
        const raw = await storage.get(key);
        return raw && typeof raw === "object" && key in raw ? raw[key] : undefined;
    }

    public async getSync(key: string): Promise<any> {
        return this.get(this.sync!, key);
    }

    public async setSync(items: any): Promise<any> {
        return this.sync!.set(items);
    }

    public async setCache(key: string, value: any, duration: number): Promise<void> {
        const values: { [key: string]: ICacheData } = {};
        values["cache_" + key] = {
            value,
            expiration: new Date().getTime() + duration,
        };
        await this.local!.set(values);
    }

    public async getCache(key: string): Promise<any> {
        const data: ICacheData = await this.get(this.local!, "cache_" + key);
        if (data && data.expiration > new Date().getTime()) {
            return data.value;
        }
        return undefined;
    }
}
