import { clone } from "./clone";

describe("clone", () => {
    it("Copy basic values", () => {
        expect(clone(null)).toEqual(null);
        expect(clone(undefined)).toEqual(undefined);
        expect(clone(3)).toEqual(3);
        expect(clone("test")).toEqual("test");
    });

    it("Clone basic arrays", () => {
        expect(clone([])).toEqual([]);
        expect(clone([1, 2, 3])).toEqual([1, 2, 3]);
        expect(clone(["test"])).toEqual(["test"]);
    });

    it("Clone objects", () => {
        const obj = {
            a: 1,
            b: "string",
            c: [1, 2, 3],
        };

        expect(clone(obj)).not.toBe(obj);
        expect(clone(obj)).toEqual(obj);
    });
});
