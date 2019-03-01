import { Permission } from "./Permission";

let permissionRequests: number;
function setUpBrowser(contained: boolean, allowed: boolean) {
    permissionRequests = 0;
    const listeners: any[] = [];
    window.browser = {
        permissions: {
            requests: 0,
            contains: () => Promise.resolve(contained),
            request: () => {
                permissionRequests++;
                contained = allowed;
                return Promise.resolve(allowed);
            },
        },
        runtime: {
            sendMessage: (msg: any) => {
                for (const listener of listeners) {
                    listener(msg);
                }
            },
            onMessage: {
                addListener: (listener: any) => listeners.push(listener),
            },
        },
    } as any;
}

describe("Permission", () => {
    it("Is marked as granted if granted on init", async () => {
        setUpBrowser(true, false);

        const permission = new Permission({ permissions: ["webNavigation"] });
        await permission.init();

        expect(permission.isGranted()).toBe(true);
    });

    it("Is marked as non granted if not granted on init", async () => {
        setUpBrowser(false, false);

        const permission = new Permission({ permissions: ["webNavigation"] });
        await permission.init();

        expect(permission.isGranted()).toBe(false);
    });

    it("Requests permissions and returns its new status", async () => {
        setUpBrowser(false, true);

        const permission = new Permission({ permissions: ["webNavigation"] });
        await permission.init();
        const result = await permission.request();

        expect(result).toBe(true);
        expect(permission.isGranted()).toBe(true);
        expect(permissionRequests).toBe(1);
    });

    it("Does not request permissions if they are already granted", async () => {
        setUpBrowser(true, false);

        const permission = new Permission({ permissions: ["webNavigation"] });
        await permission.init();
        const result = await permission.request();

        expect(result).toBe(true);
        expect(permission.isGranted()).toBe(true);
        expect(permissionRequests).toBe(0);
    });

    it("Synchronizes with other identical Permission objects", async () => {
        setUpBrowser(false, true);

        const permission1 = new Permission({ permissions: ["webNavigation"] });
        await permission1.init();
        const permission2 = new Permission({ permissions: ["webNavigation"] });
        await permission2.init();

        expect(permission1.isGranted()).toBe(false);
        expect(permission2.isGranted()).toBe(false);

        const result = await permission1.request();

        expect(result).toBe(true);
        expect(permission1.isGranted()).toBe(true);
        expect(permission2.isGranted()).toBe(true);
        expect(permissionRequests).toBe(1);
    });
});
