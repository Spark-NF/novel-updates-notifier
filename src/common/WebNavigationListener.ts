import { IListener } from "./Listener";

export abstract class WebNavigationListener implements IListener {
    public isActive(): boolean {
        return browser.webNavigation.onCommitted.hasListener(this.onCommitted);
    }

    public add(): void {
        if (!this.isActive()) {
            browser.webNavigation.onCommitted.addListener(this.onCommitted);
        }
    }

    public remove(): void {
        if (this.isActive()) {
            browser.webNavigation.onCommitted.removeListener(this.onCommitted);
        }
    }

    protected abstract async onCommitted(data: any): Promise<void>;
}
