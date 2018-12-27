import { objectToParams } from "./ajax";

describe("objectToParams", () => {
    it("Returns an empty string for non-objects", () => {
        expect(objectToParams(undefined)).toBe("");
        expect(objectToParams(null)).toBe("");
        expect(objectToParams(123)).toBe("");
        expect(objectToParams("test")).toBe("");
    });

    it("Ignores objects and undefined values", () => {
        expect(objectToParams({ obj: { b: 2 }, a: 1, un: undefined })).toBe("a=1");
    });

    it("Works properly on normal objects", () => {
        expect(objectToParams({ a: 1, b: 2, c: "test" })).toBe("a=1&b=2&c=test");
    });
});
