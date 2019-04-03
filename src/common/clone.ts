export function clone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}
