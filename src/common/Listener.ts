import { Permission } from "./Permission";

export interface IListener {
    isActive(): boolean;
    add(): void;
    remove(): void;
}

export function waitForPermission(listener: IListener, permission: Permission): void {
    // If we already have the permission, there is nothing to do
    if (permission.isGranted()) {
        listener.add();
    }

    // Otherwise, we wait for the permission to be granted
    permission.addEventListener("change", (isGranted: boolean) => {
        if (isGranted) {
            listener.add();
        } else {
            listener.remove();
        }
    });
}
