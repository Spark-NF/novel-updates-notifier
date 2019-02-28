import { Permission } from "./Permission";

export class Permissions {
    public webNavigation: Permission;
    public contentScripts: Permission;

    constructor() {
        this.webNavigation = new Permission({ permissions: ["webNavigation"] });

        const domains = [
            "www.webnovel.com",
            "m.webnovel.com",
            "www.wuxiaworld.com",
        ];
        const origins = domains.map((d: string) => "*://" + d + "/*");
        this.contentScripts = new Permission({ origins });
    }

    public async init(): Promise<void> {
        this.webNavigation.init();
        this.contentScripts.init();
    }
}
