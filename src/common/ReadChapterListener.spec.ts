import { IReadingListResult, IReadingListResultChapter } from "./NovelUpdatesClient";
import { ReadChapterListener } from "./ReadChapterListener";

function makeMock() {
    window.sessionStorage.clear();

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

    return async (data: any) => {
        for (const listener of listeners) {
            await listener(data);
        }
    };
}

describe("ReadChapterListener", async () => {
    const chapters: IReadingListResultChapter[] = [{
        id: 1,
        name: "c1",
        html: "c1",
        url: "http://novel.com/c1",
    }, {
        id: 2,
        name: "c2",
        html: "c2",
        url: "https://novel.com/c2",
    }, {
        id: 3,
        name: "c3",
        html: "c3",
        url: "http://novel.com/c3",
    }];

    const novels: IReadingListResult[] = [{
        id: 123,
        name: "Test novel",
        url: "http://novel.com/",
        notes: {
            hasNotes: false,
            tags: [],
        },
        chapters,
        status: chapters[0],
        next: chapters.slice(1),
        latest: chapters[chapters.length - 1],
    }];

    it("Ignores iframe navigation", async () => {
        const fireEvent = makeMock();
        const callback = jest.fn();

        const listener = new ReadChapterListener(jest.fn().mockResolvedValue(novels), callback);

        listener.add();
        expect(listener.isActive()).toBe(true);

        await fireEvent({
            frameId: 0,
            tabId: 1,
            url: "http://novel.com/c1",
        });
        await fireEvent({
            frameId: 1,
            tabId: 1,
            url: "https://novel.com/c2",
        });
        expect(callback.mock.calls.length).toBe(0);
    });

    it("Does not fire for random urls", async () => {
        const fireEvent = makeMock();
        const callback = jest.fn();

        const listener = new ReadChapterListener(jest.fn().mockResolvedValue(novels), callback);

        listener.add();
        expect(listener.isActive()).toBe(true);

        await fireEvent({
            frameId: 0,
            tabId: 1,
            url: "http://novel.com/c1",
        });
        await fireEvent({
            frameId: 0,
            tabId: 1,
            url: "test.com",
        });
        expect(callback.mock.calls.length).toBe(0);
    });

    it("Does not fire for other tabs", async () => {
        const fireEvent = makeMock();
        const callback = jest.fn();

        const listener = new ReadChapterListener(jest.fn().mockResolvedValue(novels), callback);

        listener.add();
        expect(listener.isActive()).toBe(true);

        await fireEvent({
            frameId: 0,
            tabId: 1,
            url: "http://novel.com/c1",
        });
        await fireEvent({
            frameId: 0,
            tabId: 2,
            url: "https://novel.com/c2",
        });
        expect(callback.mock.calls.length).toBe(0);
    });

    it("Fires for same tab navigation", async () => {
        const fireEvent = makeMock();
        const callback = jest.fn();

        const listener = new ReadChapterListener(jest.fn().mockResolvedValue(novels), callback);

        listener.add();
        expect(listener.isActive()).toBe(true);

        await fireEvent({
            frameId: 0,
            tabId: 1,
            url: "http://novel.com/c1",
        });
        await fireEvent({
            frameId: 0,
            tabId: 1,
            url: "https://novel.com/c2",
        });
        expect(callback.mock.calls.length).toBe(1);
    });
});
