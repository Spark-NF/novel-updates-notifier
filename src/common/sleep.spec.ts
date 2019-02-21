import { sleep } from "./sleep";

async function elapsed(cb: () => Promise<void>): Promise<number> {
    const before = new Date();
    await cb();
    const after = new Date();

    return after.getTime() - before.getTime();
}

describe("sleep", () => {
    it("Immediately returns for invalid values", async () => {
        const diff = await elapsed(async () => sleep(-1));
        expect(diff).toBeLessThan(50);
    });

    it("Waits the given duration", async () => {
        const diff = await elapsed(async () => sleep(100));
        expect(diff).toBeGreaterThanOrEqual(100);
    });
});
