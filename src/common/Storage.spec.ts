import { sleep } from "./sleep";
import { Storage } from "./Storage";

class FakeStorageArea implements browser.storage.StorageArea {
    private data: { [key: string]: any } = {};

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

describe("Storage", () => {
    it("Returns default settings if none are set", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const interval = await storage.getSetting("interval");
        expect(interval).toBe(5);

        const settings = await storage.getSettings();
        expect(settings.interval).toBe(5);
        expect(settings.notifications).toBe(true);
    });

    it("Returns the user's settings if they exist", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        await storage.setSettings({ interval: 10 });

        const interval = await storage.getSetting("interval");
        expect(interval).toBe(10);

        const settings = await storage.getSettings();
        expect(settings.interval).toBe(10);
        expect(settings.notifications).toBe(true);
    });

    it("Caches values properly", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const before = await storage.getCache("some_key");
        expect(before).toBe(undefined);

        await storage.setCache("some_key", 123, 100);

        const during = await storage.getCache("some_key");
        expect(during).toBe(123);

        await sleep(100);

        const after = await storage.getCache("some_key");
        expect(after).toBe(undefined);
    });
});
