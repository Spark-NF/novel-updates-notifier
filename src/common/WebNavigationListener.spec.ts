import { WebNavigationListener } from "./WebNavigationListener";

class TestListener extends WebNavigationListener {
    protected onCommitted(data: any): Promise<void> { /* No-op */ }
}

function makeMock() {
    const listeners: any[] = [];
    const mock = {
        hasListener: jest.fn((l) => listeners.includes(l)),
        addListener: jest.fn((l) => listeners.push(l)),
        removeListener: jest.fn((l) => listeners.includes(l) && listeners.splice(listeners.indexOf(l), 1)),
    };

    window.browser = {
        webNavigation: {
            onCommitted: mock,
        },
    } as any;
    return mock;
}

describe("WebNavigationListener", () => {
    it("Is inactive on creation", () => {
        makeMock();

        const listener = new TestListener();
        expect(listener.isActive()).toBe(false);
    });

    it("It is active after being added", () => {
        const mock = makeMock();

        const listener = new TestListener();
        listener.add();

        expect(listener.isActive()).toBe(true);
        expect(mock.addListener.mock.calls.length).toBe(1);
    });

    it("Adding it multiple times does nothing", () => {
        const mock = makeMock();

        const listener = new TestListener();
        for (let i = 0; i < 3; ++i) {
            listener.add();
        }

        expect(listener.isActive()).toBe(true);
        expect(mock.addListener.mock.calls.length).toBe(1);
    });

    it("Is inactive after being removed", () => {
        const mock = makeMock();

        const listener = new TestListener();
        listener.add();
        listener.remove();

        expect(listener.isActive()).toBe(false);
        expect(mock.addListener.mock.calls.length).toBe(1);
        expect(mock.removeListener.mock.calls.length).toBe(1);
    });

    it("Removing it when inactive does nothing", () => {
        const mock = makeMock();

        const listener = new TestListener();
        listener.remove();

        expect(listener.isActive()).toBe(false);
        expect(mock.removeListener.mock.calls.length).toBe(0);
    });
});
