import { FakeStorageArea } from "./FakeStorageArea";
import { sleep } from "./sleep";
import { Storage } from "./Storage";

describe("Storage", () => {
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

    it("Loads inner storages from the browser object", async () => {
        const sync = new FakeStorageArea();
        const local = new FakeStorageArea();
        window.browser = {
            storage: {
                sync,
                local,
            },
        } as any;

        const storage = new Storage();
        await storage.init();

        await storage.setSync({ test_sync: "val" });
        await storage.setCache("test_local", "val", 100);

        expect(sync.data).toHaveProperty("test_sync");
        expect(local.data).toHaveProperty("cache_test_local");
    });

    it("Fallbacks to the local storage if sync is not available", async () => {
        const local = new FakeStorageArea();
        window.browser = {
            storage: {
                sync: {
                    get: () => { throw Error("Sync storage disabled"); },
                },
                local,
            },
        } as any;

        const storage = new Storage();
        await storage.init();

        await storage.setSync({ test_sync: "val" });
        await storage.setCache("test_local", "val", 100);

        expect(local.data).toHaveProperty("test_sync");
        expect(local.data).toHaveProperty("cache_test_local");
    });
});
