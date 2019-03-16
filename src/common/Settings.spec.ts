import { FakeStorageArea } from "./FakeStorageArea";
import { Settings } from "./Settings";
import { Storage } from "./Storage";

function setUpBrowser() {
    window.browser = {
        runtime: {
            onMessage: {
                addListener: () => { /* No-op */ },
            },
        },
    } as any;
}

describe("Settings", () => {
    it("Builds all settings with correct default values", async () => {
        setUpBrowser();

        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const settings = new Settings(storage);
        await settings.preload();

        const interval = settings.interval.get();
        expect(interval).toBe(5);
    });
});
