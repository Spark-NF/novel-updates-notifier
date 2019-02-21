import { ajax, objectToParams } from "./ajax";

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

describe("ajax", () => {
    it("Returns the response of a GET request", async () => {
        const rq = await ajax("https://raw.githubusercontent.com/Spark-NF/novel-updates-notifier/master/README.md");
        expect(rq.responseText).toContain("Novel Updates Notifier");
    });
});
