import { IFilter, isValid } from "./Filter";

describe("isValid", () => {
    it("Returns true for a valid filter", () => {
        const novel: any = { nextLength: 0 };
        const filter: IFilter = {
            operator: "eq",
            value: 0,
            what: "unread",
        };

        expect(isValid(novel, [filter])).toBe(true);
    });

    it("Returns true for an invalid filter", () => {
        const novel: any = { nextLength: 0 };
        const filter: IFilter = {
            operator: "lt",
            value: 0,
            what: "unread",
        };

        expect(isValid(novel, [filter])).toBe(false);
    });

    it("Works with 'days since first unread chapter' filters", () => {
        const novel: any = { next: { date: new Date("2019-01-01") }, nextLength: 1 };
        const filter: IFilter = {
            operator: "ge",
            value: 1,
            what: "days_since_first_unread",
        };

        expect(isValid(novel, [filter])).toBe(true);
    });

    it("Works with 'days since last chapter' filters", () => {
        const novel: any = { latest: { date: new Date("2019-01-01") } };
        const filter: IFilter = {
            operator: "gt",
            value: 1,
            what: "days_since_latest",
        };

        expect(isValid(novel, [filter])).toBe(true);
    });
});
