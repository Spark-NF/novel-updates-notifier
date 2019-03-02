import { waitForPermission } from "./Listener";
import { Observable } from "./Observable";

class FakePermission extends Observable {
    constructor(private granted: boolean) {
        super();
    }

    public isGranted(): boolean {
        return this.granted;
    }
}

function makeMock(active: boolean) {
    return {
        isActive: () => active,
        add: jest.fn(),
        remove: jest.fn(),
    };
}

describe("waitForPermission", async () => {
    it("Directly calls add if the permission is already granted", async () => {
        const listener = makeMock(false);
        const permission = new FakePermission(true);

        waitForPermission(listener, permission as any);
        expect(listener.add.mock.calls.length).toBe(1);
    });

    it("Wait for the permission state to change if it's not granted yet", async () => {
        const listener = makeMock(false);
        const permission = new FakePermission(false);

        waitForPermission(listener, permission as any);
        expect(listener.add.mock.calls.length).toBe(0);

        permission.fireEvent("change", [true]);
        expect(listener.add.mock.calls.length).toBe(1);

        permission.fireEvent("change", [false]);
        expect(listener.remove.mock.calls.length).toBe(1);
    });

    it("Automatically remove the listener if the permission is lost", async () => {
        const listener = makeMock(true);
        const permission = new FakePermission(true);

        waitForPermission(listener, permission as any);
        expect(listener.remove.mock.calls.length).toBe(0);

        permission.fireEvent("change", [false]);
        expect(listener.remove.mock.calls.length).toBe(1);
    });
});
