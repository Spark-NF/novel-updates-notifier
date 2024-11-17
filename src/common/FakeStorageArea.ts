export class FakeStorageArea implements browser.storage.StorageArea {
    public data: { [key: string]: any } = {};

    public async get(keys?: null | string | string[] | object): Promise<any> {
        keys = Array.isArray(keys) || keys === null || keys === undefined ? keys : [keys];
        const ret: { [key: string]: any } = {};
        for (const key in this.data) {
            if (Object.prototype.hasOwnProperty.call(this.data, key) && (keys === null || (keys as string[]).includes(key))) {
                ret[key] = this.data[key];
            }
        }
        return ret;
    }

    public async set(items: any): Promise<void> {
        for (const key in items) {
            if (Object.prototype.hasOwnProperty.call(items, key)) {
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
