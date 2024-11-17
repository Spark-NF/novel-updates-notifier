import { IListener } from "./Listener";

// declare var chrome: any;

export class ContentScriptsManager implements IListener {
    private domains: string[];
    private file: string;

    private handle?: browser.contentScripts.RegisteredContentScript;

    constructor(domains: string[], file: string) {
        this.domains = domains;
        this.file = file;

        this.handle = undefined;
    }

    public isActive(): boolean {
        return this.handle !== undefined;
    }

    public async add(): Promise<void> {
        // If the content scripts are already added, we don't re-add them
        if (this.isActive()) {
            return;
        }

        // Firefox
        if (browser.contentScripts && browser.contentScripts.register) {
            this.handle = await browser.contentScripts.register({
                matches: this.domains.map((d: string) => "*://" + d + "/*"),
                allFrames: true,
                runAt: "document_start",
                js: [{
                    file: this.file,
                }],
            });
            return;
        }

        // Chrome (disabled because custom CSS is a sidebar feature)
        /*if (chrome.declarativeContent && chrome.declarativeContent.onPageChanged) {
            chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
                chrome.declarativeContent.onPageChanged.addRules([{
                    conditions: this.domains.map((d: string) => new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {
                            hostEquals: d,
                        },
                    })),
                    actions: [
                        new chrome.declarativeContent.RequestContentScript({
                            js: [this.file],
                        }),
                    ],
                }]);
            });
        }*/
    }

    public async remove(): Promise<void> {
        if (!this.isActive()) {
            return;
        }

        await this.handle!.unregister();
        this.handle = undefined;
    }
}
