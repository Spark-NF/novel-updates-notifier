import { FakeStorageArea } from "./FakeStorageArea";
import { Setting } from "./Setting";
import { sleep } from "./sleep";
import { Storage } from "./Storage";

function setUpBrowser() {
    const listeners: any[] = [];
    window.browser = {
        runtime: {
            sendMessage: (msg: any) => {
                for (const listener of listeners) {
                    listener(msg);
                }
            },
            onMessage: {
                addListener: (listener: any) => listeners.push(listener),
            },
        },
    } as any;
}

describe("Setting", () => {
    beforeEach(setUpBrowser);

    it("Returns the default value if none is set", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const setting = new Setting<number>(storage, "test", 5);
        await setting.preload();

        const val = setting.get();
        expect(val).toBe(5);
    });

    it("Returns the user's settings if they exist", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const setter = new Setting<number>(storage, "test", 5);
        await setter.preload();
        await setter.set(7);

        const getter = new Setting<number>(storage, "test", 5);
        await getter.preload();
        const val = getter.get();
        expect(val).toBe(7);
    });

    it("Triggers the 'change' event when the value is changed", async () => {
        const handler = jest.fn();

        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const setting = new Setting<number>(storage, "test", 5);
        setting.addEventListener("change", handler);

        await setting.set(7);
        expect(handler.mock.calls.length).toBe(1);
        expect(handler.mock.calls[0]).toEqual([7]);

        await setting.set(7);
        expect(handler.mock.calls.length).toBe(1);
    });

    it("Synchronizes with other identical Permission objects", async () => {
        const mock = new FakeStorageArea();
        const storage = new Storage();
        await storage.init(mock, mock);

        const setting1 = new Setting<number>(storage, "test", 5);
        await setting1.preload();
        const setting2 = new Setting<number>(storage, "test", 6);
        await setting2.preload();

        expect(setting1.get()).toBe(5);
        expect(setting2.get()).toBe(6);

        await setting1.set(7);
        await sleep(20);

        expect(setting1.get()).toBe(7);
        expect(setting2.get()).toBe(7);
    });
});
