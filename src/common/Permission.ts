import { Observable } from "./Observable";

type Permissions = browser.permissions.Permissions;

export class Permission extends Observable {
    private permissions: Permissions;
    private granted?: boolean;

    constructor(permissions: Permissions) {
        super();

        this.permissions = permissions;
    }

    public async init(): Promise<void> {
        this.granted = await browser.permissions.contains(this.permissions);
    }

    public async request(): Promise<boolean> {
        if (this.granted) {
            return true;
        }
        this.granted = await browser.permissions.request(this.permissions);
        this.fireEvent("change", [this.granted]);
        return this.granted;
    }

    public isGranted(): boolean {
        return this.granted;
    }
}
