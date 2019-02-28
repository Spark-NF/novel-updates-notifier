import { Observable } from "./Observable";

describe("Observable", () => {
    it("Works if no handlers are set", async () => {
        const obs = new Observable();

        obs.fireEvent("test");
    });

    it("Passes the arguments to the handler", async () => {
        const handler = jest.fn();

        const obs = new Observable();
        obs.addEventListener("test", handler);
        obs.fireEvent("test", [7, "arg"]);

        expect(handler.mock.calls.length).toBe(1);
        expect(handler.mock.calls[0]).toEqual([7, "arg"]);
    });

    it("Calls multiple handlers", async () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        const obs = new Observable();
        obs.addEventListener("test", handler1);
        obs.addEventListener("test", handler2);
        obs.fireEvent("test");

        expect(handler1.mock.calls.length).toBe(1);
        expect(handler2.mock.calls.length).toBe(1);
    });

    it("Doesn't fail when trying to remove non-added handler", async () => {
        const handler = jest.fn();

        const obs = new Observable();
        obs.removeEventListener("test", handler);
    });

    it("Removes already added handlers", async () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        const obs = new Observable();
        obs.addEventListener("test", handler1);
        obs.addEventListener("test", handler2);
        obs.removeEventListener("test", handler1);
        obs.fireEvent("test");

        expect(handler1.mock.calls.length).toBe(0);
        expect(handler2.mock.calls.length).toBe(1);
    });
});
