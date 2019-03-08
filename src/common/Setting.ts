import { Observable } from "./Observable";
import { Storage } from "./Storage";

export class Setting<T> extends Observable {
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
        this.value = await this.storage.getSync("setting_" + this.key) || this.def;
    }

    private async sync(): Promise<void> {
        const items: any = {};
        items[this.key] = this.value;

        await this.storage.setSync(items);
    }

    public async preload(): Promise<void> {
        if (this.value === undefined) {
            await this.reload();
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
        }
    }
}
