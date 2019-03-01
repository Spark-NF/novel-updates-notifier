import { ContentScriptsManager } from "./ContentScriptsManager";

function makeMock() {
    const unregister = jest.fn();
    const register = jest.fn().mockResolvedValue({ unregister });

    window.browser = {
        contentScripts: {
            register,
        },
    } as any;

    return { register, unregister };
}

describe("ContentScriptsManager", () => {
    it("Is inactive on creation", async () => {
        makeMock();

        const manager = new ContentScriptsManager(["test.com"], "script.js");
        expect(manager.isActive()).toBe(false);
    });

    it("It is active after being added", async () => {
        const mock = makeMock();

        const manager = new ContentScriptsManager(["test.com"], "script.js");
        await manager.add();

        expect(manager.isActive()).toBe(true);
        expect(mock.register.mock.calls.length).toBe(1);
    });

    it("Adding it multiple times does nothing", async () => {
        const mock = makeMock();

        const manager = new ContentScriptsManager(["test.com"], "script.js");
        for (let i = 0; i < 3; ++i) {
            await manager.add();
        }

        expect(manager.isActive()).toBe(true);
        expect(mock.register.mock.calls.length).toBe(1);
    });

    it("Is inactive after being removed", async () => {
        const mock = makeMock();

        const manager = new ContentScriptsManager(["test.com"], "script.js");
        await manager.add();
        await manager.remove();

        expect(manager.isActive()).toBe(false);
        expect(mock.register.mock.calls.length).toBe(1);
        expect(mock.unregister.mock.calls.length).toBe(1);
    });

    it("Removing it when inactive does nothing", async () => {
        const mock = makeMock();

        const manager = new ContentScriptsManager(["test.com"], "script.js");
        await manager.remove();

        expect(manager.isActive()).toBe(false);
        expect(mock.unregister.mock.calls.length).toBe(0);
    });
});
