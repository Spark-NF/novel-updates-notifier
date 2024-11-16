import { ajax, objectToParams, syncPartitionedCookies } from "./ajax";

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

describe("syncPartitionedCookies", () => {
    it("Does nothing if all the cookies are already available", async () => {
        const nonPartitionedCookies = [{name: "test"}];
        const allCookies = [{name: "test"}, {name: "test", partitionKey: "partition"}];
        const mockSet = jest.fn()
        window.browser = {
            cookies: {
                getAll: jest.fn().mockResolvedValueOnce(nonPartitionedCookies).mockResolvedValueOnce(allCookies),
                set: mockSet,
            },
        } as any;

        await syncPartitionedCookies("https://github.com");
        expect(mockSet).not.toHaveBeenCalled();
    });

    it("Sets the value without a partition key if not found", async () => {
        const allCookies = [{name: "test", partitionKey: "partition"}];
        const mockSet = jest.fn()
        window.browser = {
            cookies: {
                getAll: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(allCookies),
                set: mockSet,
            },
        } as any;

        await syncPartitionedCookies("https://github.com");
        expect(mockSet).toHaveBeenCalledWith({ url: "https://github.com", name: "test" });
    });
});

describe("ajax", () => {
    it("Returns the response of a GET request", async () => {
        window.browser = {
            cookies: {
                getAll: jest.fn().mockResolvedValue([]),
                set: jest.fn(),
            },
        } as any;

        const rq = await ajax("https://raw.githubusercontent.com/Spark-NF/novel-updates-notifier/master/README.md");
        expect(rq.responseText).toContain("Novel Updates Notifier");
    });
});
