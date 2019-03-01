import { Permission } from "../common/Permission";

declare var chrome: any;

export class ContentScriptsManager {
    private permission: Permission;
    private domains: string[];
    private handle?: browser.contentScripts.RegisteredContentScript;

    constructor(permission: Permission, domains: string[]) {
        this.permission = permission;
        this.domains = domains;
        this.handle = undefined;
    }

    public async init(): Promise<void> {
        // If we already have the permission, there is nothing to do
        if (this.permission.isGranted()) {
            this.add();
            return;
        }

        // Otherwise, we wait for the permission to be granted
        this.permission.addEventListener("change", (isGranted: boolean) => {
            if (isGranted) {
                this.add();
            }
        });
    }

    private async add(): Promise<void> {
        // If the content scripts are already added, we don't re-add them
        if (this.handle !== undefined) {
            return;
        }

        // Firefox
        if (browser.contentScripts && browser.contentScripts.register) {
            this.handle = await browser.contentScripts.register({
                matches: this.domains.map((d: string) => "*://" + d + "/*"),
                allFrames: true,
                runAt: "document_start",
                js: [{
                    file: "src/userstyles/bundle.js",
                }],
            });
            return;
        }

        // Chrome (disabled because custom CSS is a sidebar feature)
        if (false && chrome.declarativeContent && chrome.declarativeContent.onPageChanged) {
            chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
                chrome.declarativeContent.onPageChanged.addRules([{
                    conditions: this.domains.map((d: string) => new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {
                            hostEquals: d,
                        },
                    })),
                    actions: [
                        new chrome.declarativeContent.RequestContentScript({
                            js: ["src/userstyles/bundle.js"],
                        }),
                    ],
                }]);
            });
        }
    }
}