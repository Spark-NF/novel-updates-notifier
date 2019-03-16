import { Observable } from "./Observable";
import { Storage } from "./Storage";

export class Setting<T> extends Observable {
    private static PREFIX = "setting_";

    private storage: Storage;
    private key: string;
    private def: T;
    private value?: T;

    constructor(storage: Storage, key: string, def: T) {
        super();

        this.storage = storage;
        this.key = key;
        this.def = def;
    }

    private async reload(): Promise<void> {
        this.value = await this.storage.getSync(Setting.PREFIX + this.key) || this.def;
    }

    private async sync(): Promise<void> {
        const items: any = {};
        items[Setting.PREFIX + this.key] = this.value;

        await this.storage.setSync(items);
    }

    public async preload(): Promise<void> {
        if (this.value === undefined) {
            await this.reload();

            browser.runtime.onMessage.addListener((msg) => {
                if ("type" in msg && msg.type === "setting-change" && msg.key === this.key) {
                    this.reload();
                }
            });
        }
    }

    public get(): T {
        return this.value;
    }

    public async set(value: T): Promise<void> {
        if (value !== this.value) {
            this.value = value;
            await this.sync();

            this.fireEvent("change", [this.value]);
            browser.runtime.sendMessage({ type: "setting-change", key: this.key });
        }
    }
}
