import { NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { Storage } from "../common/Storage";

interface IBackground extends Window {
    storage: Storage;
    client: NovelUpdatesClient;

    checkLoginStatus: any;
    getReadingList: any;
    reloadReadingList: any;
    tryLogin: any;

    nextListRefresh?: Date;
}

const background = browser.extension.getBackgroundPage() as IBackground;

const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const loginDiv = document.getElementById("login-form");
const loginForm = loginDiv.getElementsByTagName("form")[0];
const loginFormError = document.getElementById("login-error");
const loginUsername = document.getElementsByName("username")[0] as HTMLInputElement;
const loginPassword = document.getElementsByName("password")[0] as HTMLInputElement;
const novelsDiv = document.getElementById("novel-list");
const novelsTable = document.getElementById("novel-table") as HTMLTableElement;
const novelsRefreshButton = document.getElementById("refresh-novel-list");
const searchInput = document.getElementById("search").getElementsByTagName("input")[0];
const searchResults = document.getElementById("search-results") as HTMLTableElement;
const settingsDiv = document.getElementById("settings");
const settingsForm = settingsDiv.getElementsByTagName("form")[0];
const settingsInterval = document.getElementsByName("interval")[0] as HTMLInputElement;
const settingsNotifications = document.getElementsByName("notifications")[0] as HTMLInputElement;
const settingsReadInSidebar = document.getElementsByName("read-in-sidebar")[0] as HTMLInputElement;
const settingsCustomCss = document.getElementsByName("custom-css")[0] as HTMLInputElement;
const settingsAutoMarkAsRead = document.getElementsByName("auto-mark-as-read")[0] as HTMLInputElement;
const openSettingsButton = document.getElementById("open-settings");
const nextRefreshLabel = document.getElementById("next-refresh");

async function removeNovel(id: number) {
    await background.client.removeFromList(id);
    const element = document.getElementById("novel-row-" + id);
    element.parentElement.removeChild(element);
}
async function addNovel(url: string) {
    loaderText.innerHTML = "Getting novel ID...";
    loaderDiv.classList.remove("hidden");
    searchInput.value = "";
    searchResults.classList.add("hidden");
    const id = await background.client.getIdFromUrl(url);

    loaderText.innerHTML = "Adding novel...";
    await background.client.putInList(id, 0);

    loaderText.innerHTML = "Refreshing novels...";
    await background.reloadReadingList();
    await displayNovels();
}

function makeLink(href: string, txt: string): HTMLAnchorElement {
    const link = document.createElement("a");
    link.href = href;
    link.innerHTML = txt;
    link.target = "_blank";
    return link;
}
function makeChapterLink(href: string, txt: string): HTMLAnchorElement {
    const link = makeLink(href, txt);
    link.onclick = async (e) => {
        if (e.button !== 0 && e.button !== 1) {
            return;
        }

        e.preventDefault();
        const canSidebar = browser.sidebarAction !== undefined;
        const readInSidebar = await background.storage.getSetting("readInSidebar") && canSidebar;
        const middleClick = e.button === 1;

        // Open in a new tab
        if (middleClick || !readInSidebar) {
            await browser.tabs.create({
                active: !middleClick,
                url: href,
            });
            return false;
        }

        // Open in sidebar
        await browser.sidebarAction.open();
        await browser.sidebarAction.setPanel({ panel: href });

        return false;
    };
    return link;
}

// Show next refresh timer
async function updateRefreshLabel() {
    if (!background.nextListRefresh) {
        return;
    }

    const interval = await background.storage.getSetting("interval");

    const secs = Math.max(0, Math.round((background.nextListRefresh.getTime() - new Date().getTime()) / 1000));
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);

    if (interval > 60) {
        const strHours = hours.toString();
        const strMins = (mins % 60).toString().padStart(2, "0");
        const strSecs = (secs % 60).toString().padStart(2, "0");
        nextRefreshLabel.innerHTML = `${strHours}:${strMins}:${strSecs}`;
    } else {
        const strMins = mins.toString();
        const strSecs = (secs % 60).toString().padStart(2, "0");
        nextRefreshLabel.innerHTML = `${strMins}:${strSecs}`;
    }
}
setInterval(updateRefreshLabel, 1000);

async function displayNovels() {
    const novels = await background.getReadingList();

    // Empty the novels table first
    let rowCount = novelsTable.rows.length;
    while (--rowCount > 0) {
        novelsTable.deleteRow(rowCount);
    }

    // Populate the table
    for (const novel of novels) {
        const row = novelsTable.insertRow();
        row.id = "novel-row-" + novel.id;
        if (novel.status.id !== novel.latest.id) {
            row.classList.add("table-warning");
        }

        const nameCell = row.insertCell();
        nameCell.classList.add("novel-name");
        nameCell.appendChild(makeLink(novel.url, novel.name));
        const unreadCount = novel.latest.number - novel.status.number;
        const unreadLabel = unreadCount > 0 ? String(unreadCount) : (novel.status.id !== novel.latest.id ? "!" : "");
        if (unreadLabel) {
            const counter = document.createElement("span");
            counter.classList.add("badge");
            counter.classList.add("badge-primary");
            counter.innerHTML = unreadLabel;
            nameCell.appendChild(counter);
        }

        const readCell = row.insertCell();
        readCell.classList.add("novel-chapter");
        readCell.appendChild(makeChapterLink(novel.status.url, novel.status.html));

        const nextCell = row.insertCell();
        nextCell.classList.add("novel-chapter");
        if (novel.next.length > 0) {
            nextCell.appendChild(makeChapterLink(novel.next[0].url, novel.next[0].html));
        }

        const latestCell = row.insertCell();
        latestCell.classList.add("novel-chapter");
        latestCell.appendChild(makeChapterLink(novel.latest.url, novel.latest.html));

        const actionsCell = row.insertCell();
        const removeButton = document.createElement("button");
        removeButton.className = "btn btn-xs btn-danger btn-icon";
        removeButton.onclick = () => { removeNovel(novel.id); };
        removeButton.innerHTML = '<i class="fa fa-trash-o"></i>';
        actionsCell.appendChild(removeButton);
        actionsCell.style.width = "0%";
    }

    updateRefreshLabel();
    loaderDiv.classList.add("hidden");
    novelsDiv.classList.remove("hidden");
}

// Settings page
openSettingsButton.onclick = async () => {
    const settings = await background.storage.getSettings();

    // Populate the form with the user settings
    settingsInterval.value = settings.interval.toString();
    settingsNotifications.checked = settings.notifications;
    settingsAutoMarkAsRead.checked = settings.autoMarkAsRead;

    // Only show the sidebar settings if the API is available
    if (browser.sidebarAction) {
        settingsReadInSidebar.checked = settings.readInSidebar;
        settingsCustomCss.checked = settings.customCss;
    }

    settingsDiv.classList.remove("hidden");
};
settingsForm.onsubmit = async () => {
    await background.storage.setSettings({
        interval: parseInt(settingsInterval.value, 10),
        notifications: !!settingsNotifications.checked,
        readInSidebar: !!settingsReadInSidebar.checked,
        customCss: !!settingsCustomCss.checked,
        autoMarkAsRead: !!settingsAutoMarkAsRead.checked,
    });
    settingsDiv.classList.add("hidden");
};

// Button to refresh novel list
novelsRefreshButton.onclick = async () => {
    loaderText.innerHTML = "Refreshing novels...";
    loaderDiv.classList.remove("hidden");

    await background.reloadReadingList();
    await displayNovels();
};

// Show search results input change
let latestSearch = "";
searchInput.oninput = async () => {
    const val = searchInput.value.trim();
    latestSearch = val;
    if (val.length === 0) {
        searchResults.classList.add("hidden");
    } else {
        searchResults.classList.remove("hidden");
        searchResults.innerHTML = "Loading results...";
        const results = await background.client.search(val);
        if (val !== latestSearch) {
            return;
        }
        searchResults.innerHTML = "";
        for (let i = 0; i < 5 && i < results.length; ++i) {
            const result = results[i];
            const row = searchResults.insertRow();
            const imgCell = row.insertCell();
            imgCell.classList.add("novel-icon");
            imgCell.style.width = "0%";
            const img = document.createElement("img");
            img.alt = "";
            img.src = result.img;
            imgCell.appendChild(img);
            const nameCell = row.insertCell();
            nameCell.classList.add("novel-name");
            nameCell.appendChild(makeLink(result.url, result.name));
            const actionsCell = row.insertCell();
            const addButton = document.createElement("button");
            addButton.className = "btn btn-xs btn-success btn-icon";
            addButton.onclick = () => { addNovel(result.url); };
            addButton.innerHTML = '<i class="fa fa-plus"></i>';
            actionsCell.appendChild(addButton);
            actionsCell.style.width = "0%";
        }
    }
};

// Store credentials on login form submit
loginForm.onsubmit = async (e) => {
    e.preventDefault();

    loaderText.innerHTML = "Logging in...";
    loaderDiv.classList.remove("hidden");

    await background.storage.setSettings({
        username: loginUsername.value,
        password: loginPassword.value,
    });

    if (await background.tryLogin()) {
        loginFormError.classList.add("hidden");
        loginDiv.classList.add("hidden");

        await background.reloadReadingList();
        await displayNovels();
    } else {
        loginFormError.innerHTML = "Login failure";
        loginFormError.classList.remove("hidden");

        loaderDiv.classList.add("hidden");
    }

    return false;
};

// Show novels or login form on popup load
(async () => {
    if (!browser.sidebarAction) {
        settingsReadInSidebar.parentElement.parentElement.remove();
        settingsCustomCss.parentElement.parentElement.remove();
    }

    if (await background.checkLoginStatus()) {
        loaderText.innerHTML = "Loading reading list...";
        await displayNovels();
    } else {
        loaderDiv.classList.add("hidden");
        loginDiv.classList.remove("hidden");
    }
})();
