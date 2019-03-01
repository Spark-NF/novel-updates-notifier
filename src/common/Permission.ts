import { Observable } from "./Observable";

type Permissions = browser.permissions.Permissions;

function areEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export class Permission extends Observable {
    private permissions: Permissions;
    private granted?: boolean;

    constructor(permissions: Permissions) {
        super();

        this.permissions = permissions;
    }

    private set(granted: boolean, fromRequest: boolean): void {
        if (granted !== this.granted) {
            const oldValue = this.granted;
            this.granted = granted;
            if (oldValue !== undefined) {
                this.fireEvent("change", [this.granted]);
                if (fromRequest) {
                    browser.runtime.sendMessage({ type: "permissions-change", permissions: this.permissions });
                }
            }
        }
    }

    private async reload(): Promise<void> {
        this.set(await browser.permissions.contains(this.permissions), false);
    }

    public async init(): Promise<void> {
        await this.reload();

        browser.runtime.onMessage.addListener((msg) => {
            if ("type" in msg && msg.type === "permissions-change" && areEqual(msg.permissions, this.permissions)) {
                this.reload();
            }
        });
    }

    public async request(): Promise<boolean> {
        if (this.granted) {
            return true;
        }
        this.set(await browser.permissions.request(this.permissions), true);
        return this.granted;
    }

    public isGranted(): boolean {
        return this.granted;
    }
}
