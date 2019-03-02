import { Permissions } from "./Permissions";

function setUpBrowser() {
    window.browser = {
        permissions: {
            contains: (ps: any) => Promise.resolve("permissions" in ps),
        },
        runtime: {
            onMessage: {
                addListener: () => { /* No-op */ },
            },
        },
    } as any;
}

describe("Permissions", () => {
    it("Is initializes inner permissions on init", async () => {
        setUpBrowser();

        const permissions = new Permissions();
        await permissions.init();

        expect(permissions.webNavigation.isGranted()).toBe(true);
        expect(permissions.contentScripts.isGranted()).toBe(false);
    });
});
