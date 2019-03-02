import { notify } from "./notifications";

describe("notify", () => {
    it("Automatically adds an icon to the notification", async () => {
        const mock = jest.fn();
        window.browser = {
            notifications: {
                create: mock,
            },
            extension: {
                getURL: (x: string) => x,
            },
        } as any;

        await notify("Test title", "Test message");

        expect(mock.mock.calls.length).toBe(1);
        expect(mock.mock.calls[0][0].iconUrl.length).toBeGreaterThan(0);
        expect(mock.mock.calls[0][0].title).toBe("Test title");
        expect(mock.mock.calls[0][0].message).toBe("Test message");
    });
});
