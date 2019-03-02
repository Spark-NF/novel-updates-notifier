import { secondsToString } from "./time";

describe("secondsToString", () => {
    it("Works with hours", () => {
        expect(secondsToString(7 * 60 * 60 + 27 * 60 + 17, true)).toBe("7:27:17");
        expect(secondsToString(27 * 60 + 17, true)).toBe("0:27:17");
        expect(secondsToString(17, true)).toBe("0:00:17");
        expect(secondsToString(0, true)).toBe("0:00:00");
    });

    it("Works with minutes", () => {
        expect(secondsToString(27 * 60 + 17, false)).toBe("27:17");
        expect(secondsToString(92, false)).toBe("1:32");
        expect(secondsToString(60, false)).toBe("1:00");
        expect(secondsToString(17, false)).toBe("0:17");
        expect(secondsToString(0, false)).toBe("0:00");
    });

    it("Works with negative numbers", () => {
        expect(secondsToString(-17, false)).toBe("-0:17");
    });
});
