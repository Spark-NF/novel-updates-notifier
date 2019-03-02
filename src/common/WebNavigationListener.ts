import { IListener } from "./Listener";

export abstract class WebNavigationListener implements IListener {
    private onCommittedListener: any;

    constructor() {
        this.onCommittedListener = this.onCommitted.bind(this);
    }

    public isActive(): boolean {
        return browser.webNavigation.onCommitted.hasListener(this.onCommittedListener);
    }

    public add(): void {
        if (!this.isActive()) {
            browser.webNavigation.onCommitted.addListener(this.onCommittedListener);
        }
    }

    public remove(): void {
        if (this.isActive()) {
            browser.webNavigation.onCommitted.removeListener(this.onCommittedListener);
        }
    }

    protected abstract async onCommitted(data: any): Promise<void>;
}
