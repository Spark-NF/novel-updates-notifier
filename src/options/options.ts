import { Settings } from "../common/Settings";

interface IBackground extends Window {
    settings: Settings;
    enableCustomCss: () => Promise<boolean>;
}

const background = browser.extension.getBackgroundPage() as IBackground;

const settingsInterval = document.getElementsByName("interval")[0] as HTMLInputElement;
const settingsNotifications = document.getElementsByName("notifications")[0] as HTMLInputElement;
const settingsReadInSidebar = document.getElementsByName("read-in-sidebar")[0] as HTMLInputElement;
const settingsCustomCss = document.getElementsByName("custom-css")[0] as HTMLInputElement;
const settingsAutoMarkAsRead = document.getElementsByName("auto-mark-as-read")[0] as HTMLInputElement;

settingsInterval.onchange = async () => {
    await background.settings.interval.set(parseInt(settingsInterval.value, 10));
};
settingsNotifications.onchange = async () => {
    await background.settings.notifications.set(settingsNotifications.checked);
};
settingsReadInSidebar.onchange = async () => {
    await background.settings.readInSidebar.set(settingsReadInSidebar.checked);
};
settingsAutoMarkAsRead.onchange = async () => {
    if (settingsAutoMarkAsRead.checked) {
        const perms: any = {
            permissions: ["webNavigation"],
        };
        if (!await browser.permissions.contains(perms)) {
            settingsAutoMarkAsRead.checked = await browser.permissions.request(perms);
        }
    }
    await background.settings.autoMarkAsRead.set(settingsAutoMarkAsRead.checked);
};
settingsCustomCss.onchange = async () => {
    if (settingsCustomCss.checked) {
        settingsCustomCss.checked = await background.enableCustomCss();
    }
    await background.settings.customCss.set(settingsCustomCss.checked);
};

(async () => {
    // Populate the form with the user settings
    settingsInterval.value = String(await background.settings.interval.get());
    settingsNotifications.checked = await background.settings.notifications.get();
    settingsAutoMarkAsRead.checked = await background.settings.autoMarkAsRead.get();

    // Only show the sidebar settings if the API is available
    if (!browser.sidebarAction) {
        settingsReadInSidebar.parentElement.parentElement.remove();
        settingsCustomCss.parentElement.parentElement.remove();
    } else {
        settingsReadInSidebar.checked = await background.settings.readInSidebar.get();
        settingsCustomCss.checked = await background.settings.customCss.get();
    }
})();
