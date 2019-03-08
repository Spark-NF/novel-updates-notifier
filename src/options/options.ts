import { Permissions } from "../common/Permissions";
import { Settings } from "../common/Settings";

interface IBackground extends Window {
    settings: Settings;
}

const background = browser.extension.getBackgroundPage() as IBackground;
const permissions = new Permissions();

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
        settingsAutoMarkAsRead.checked = await permissions.webNavigation.request();
    }
    await background.settings.autoMarkAsRead.set(settingsAutoMarkAsRead.checked);
};
settingsCustomCss.onchange = async () => {
    if (settingsCustomCss.checked) {
        settingsCustomCss.checked = await permissions.contentScripts.request();
    }
    await background.settings.customCss.set(settingsCustomCss.checked);
};

(async () => {
    await permissions.init();

    // Populate the form with the user settings
    settingsInterval.value = String(background.settings.interval.get());
    settingsNotifications.checked = background.settings.notifications.get();
    settingsAutoMarkAsRead.checked = background.settings.autoMarkAsRead.get();

    // Only show the sidebar settings if the API is available
    if (!browser.sidebarAction) {
        settingsReadInSidebar.parentElement!.parentElement!.remove();
        settingsCustomCss.parentElement!.parentElement!.remove();
    } else {
        settingsReadInSidebar.checked = background.settings.readInSidebar.get();
        settingsCustomCss.checked = background.settings.customCss.get();
    }
})();
