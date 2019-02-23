import { FakeStorageArea } from "./FakeStorageArea";
import { Settings } from "./Settings";
import { Storage } from "./Storage";

describe("Settings", () => {
    it("Returns default settings if none are set", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const settings = new Settings(storage);

        const interval = await settings.get("interval");
        expect(interval).toBe(5);

        const all = await settings.getSettings();
        expect(all.interval).toBe(5);
        expect(all.notifications).toBe(true);
    });

    it("Returns the user's settings if they exist", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const settings = new Settings(storage);

        await settings.set("interval", 7);
        await settings.sync();
        await settings.reload();

        const interval = await settings.get("interval");
        expect(interval).toBe(7);

        await settings.setSettings({ interval: 10 });
        await settings.sync();
        await settings.reload();

        const all = await settings.getSettings();
        expect(all.interval).toBe(10);
        expect(all.notifications).toBe(true);
    });
});
