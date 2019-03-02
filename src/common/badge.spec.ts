import { setBadge } from "./badge";

describe("setBadge", () => {
    it("Does nothing if the badge action is unavailable", async () => {
        window.browser = {} as any;
        await setBadge("Text", "red", "blue");
    });

    it("Calls the proper APIs when available", async () => {
        const setBadgeText = jest.fn();
        const setBadgeBackgroundColor = jest.fn();
        const setBadgeTextColor = jest.fn();
        window.browser = {
            browserAction: {
                setBadgeText,
                setBadgeBackgroundColor,
                setBadgeTextColor,
            },
        } as any;

        await setBadge("Text", "red", "blue");

        expect(setBadgeText.mock.calls[0][0]).toEqual({ text: "Text" });
        expect(setBadgeBackgroundColor.mock.calls[0][0]).toEqual({ color: "red" });
        expect(setBadgeTextColor.mock.calls[0][0]).toEqual({ color: "blue" });
    });
});
