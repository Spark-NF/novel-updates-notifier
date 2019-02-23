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
});
