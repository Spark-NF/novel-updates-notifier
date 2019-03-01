import { Observable } from "./Observable";

type Permissions = browser.permissions.Permissions;

export class Permission extends Observable {
    private permissions: Permissions;
    private granted?: boolean;

    constructor(permissions: Permissions) {
        super();

        this.permissions = permissions;
    }

    private set(granted: boolean): void {
        if (granted !== this.granted) {
            const oldValue = this.granted;
            this.granted = granted;
            if (oldValue !== undefined) {
                this.fireEvent("change", [this.granted]);
            }
        }
    }

    public async init(): Promise<void> {
        this.set(await browser.permissions.contains(this.permissions));
    }

    public async request(): Promise<boolean> {
        if (this.granted) {
            return true;
        }
        this.set(await browser.permissions.request(this.permissions));
        return this.granted;
    }

    public isGranted(): boolean {
        return this.granted;
    }
}
