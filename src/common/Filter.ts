import { IReadingListResult } from "./NovelUpdatesClient";

export interface IFilter {
    operator: "gt" | "ge" | "eq" | "le" | "lt";
    value: number;
    what: "unread" | "days_since_first_unread" | "days_since_latest";
}

function opCompare(left: number, operator: string, right: number): boolean {
    switch (operator) {
        case "gt":
            return left > right;

        case "ge":
            return left >= right;

        case "eq":
            return left === right;

        case "le":
            return left <= right;

        case "lt":
            return left < right;

        default:
            return false;
    }
}

function daysBetween(a: Date, b: Date): number {
    return (a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000);
}

function getVal(novel: IReadingListResult, what: IFilter["what"]): number {
    switch (what) {
        case "days_since_first_unread":
            return novel.next.length > 0 && novel.next[0].date
                ? daysBetween(new Date(), novel.next[0].date)
                : 0;

        case "days_since_latest":
            return novel.latest && novel.latest.date
                ? daysBetween(new Date(), novel.latest.date)
                : 0;

        case "unread":
        default:
            return novel.next.length;
    }
}

export function isValid(novel: IReadingListResult, filters: IFilter[]): boolean {
    for (const filter of filters) {
        const val = getVal(novel, filter.what);
        if (!opCompare(val, filter.operator, filter.value)) {
            return false;
        }
    }
    return true;
}
