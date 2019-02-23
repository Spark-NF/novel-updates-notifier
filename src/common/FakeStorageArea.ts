export class FakeStorageArea implements browser.storage.StorageArea {
    public data: { [key: string]: any } = {};

    public async get(keys?: string | string[] | object): Promise<any> {
        keys = Array.isArray(keys) ? keys : (keys === null ? null : [keys]);
        const ret: { [key: string]: any } = {};
        for (const key in this.data) {
            if (this.data.hasOwnProperty(key) && (keys === null || (keys as string[]).includes(key))) {
                ret[key] = this.data[key];
            }
        }
        return ret;
    }

    public async set(items: any): Promise<void> {
        for (const key in items) {
            if (items.hasOwnProperty(key)) {
                this.data[key] = items[key];
            }
        }
    }

    public async remove(keys: string | string[]): Promise<void> {
        keys = Array.isArray(keys) ? keys : [keys];
        for (const key of keys) {
            delete this.data[key];
        }
    }

    public async clear(): Promise<void> {
        this.data = {};
    }
}
