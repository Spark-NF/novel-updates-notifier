import { IReadingListResult, IReadingListResultChapter, NovelUpdatesClient } from "../common/NovelUpdatesClient";
import { Settings } from "../common/Settings";
import { secondsToString } from "../common/time";

interface IBackground extends Window {
    settings: Settings;
    client: NovelUpdatesClient;

    checkLoginStatus: (login?: boolean) => Promise<boolean>;
    getReadingList: () => Promise<IReadingListResult[]>;
    reloadReadingList: () => Promise<void>;
    tryLogin: (username: string, password: string) => Promise<boolean>;

    nextListRefresh?: Date;
    networkError?: string;
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
const settingsBack = document.getElementById("settings-back") as HTMLButtonElement;
const openSettingsButton = document.getElementById("open-settings");
const nextRefreshLabel = document.getElementById("next-refresh");
const loadingError = document.getElementById("loading-error");

async function removeNovel(id: number) {
    await background.client.removeFromList(id);
    const element = document.getElementById("novel-row-" + id);
    element.parentElement.removeChild(element);
}
async function addNovel(url: string) {
    loaderText.textContent = "Getting novel ID...";
    loaderDiv.classList.remove("hidden");
    searchInput.value = "";
    searchResults.classList.add("hidden");
    const id = await background.client.getIdFromUrl(url);

    loaderText.textContent = "Adding novel...";
    await background.client.putInList(id, 0);

    loaderText.textContent = "Refreshing novels...";
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
function makeChapterLink(chapter: IReadingListResultChapter): HTMLElement {
    const txt = chapter.html || chapter.name;
    const url = chapter.url || (chapter.id && `https://www.novelupdates.com/extnu/${chapter.id}/`);
    if (!url) {
        const span = document.createElement("span");
        span.innerHTML = txt;
        return span;
    }

    const link = makeLink(url, txt);
    link.onclick = async (e) => {
        if (e.button !== 0 && e.button !== 1) {
            return;
        }

        e.preventDefault();
        const canSidebar = browser.sidebarAction !== undefined;
        const readInSidebar = await background.settings.readInSidebar.get() && canSidebar;
        const middleClick = e.button === 1;

        // Open in a new tab
        if (middleClick || !readInSidebar) {
            await browser.tabs.create({
                active: !middleClick,
                url,
            });
            return false;
        }

        // Open in sidebar
        await browser.sidebarAction.open();
        await browser.sidebarAction.setPanel({ panel: url });

        return false;
    };
    return link;
}

// Show next refresh timer
async function updateRefreshLabel() {
    if (!background.nextListRefresh) {
        return;
    }

    const interval = await background.settings.interval.get();
    const secs = Math.max(0, Math.round((background.nextListRefresh.getTime() - new Date().getTime()) / 1000));
    nextRefreshLabel.textContent = secondsToString(secs, interval > 60);

    // Show network error
    const errorHidden = loadingError.classList.contains("hidden");
    if (background.networkError && errorHidden) {
        loadingError.title = background.networkError;
        loadingError.classList.remove("hidden");
    } else if (!background.networkError && !errorHidden) {
        loadingError.title = "";
        loadingError.classList.add("hidden");
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
    if (novels && Array.isArray(novels)) {
        for (const novel of novels) {
            const hasNew = novel.status.id !== novel.latest.id;

            const row = novelsTable.insertRow();
            row.id = "novel-row-" + novel.id;
            if (hasNew) {
                row.classList.add("table-warning");
            }

            const nameCell = row.insertCell();
            nameCell.classList.add("novel-name");
            nameCell.appendChild(makeLink(novel.url, novel.name));
            if (novel.next.length > 0) {
                const counter = document.createElement("span");
                counter.classList.add("badge");
                counter.classList.add("badge-primary");
                counter.textContent = novel.next.length.toString();
                nameCell.appendChild(counter);
            }

            const readCell = row.insertCell();
            readCell.classList.add("novel-chapter");
            const readLink = makeChapterLink(novel.status);
            readCell.appendChild(readLink);
            const readSelect = document.createElement("select");
            readSelect.classList.add("hidden");
            const optChapters = hasNew && novel.status.id !== undefined && novel.next.length > 0
                ? [novel.status].concat(novel.next)
                : novel.chapters;
            for (const chapter of optChapters) {
                const opt = document.createElement("option");
                opt.value = chapter.id.toString();
                opt.innerText = chapter.name;
                if (chapter.id === novel.status.id) {
                    opt.selected = true;
                }
                readSelect.appendChild(opt);
            }
            readSelect.onchange = readSelect.onblur = async () => {
                const newId = parseInt(readSelect.value, 10);
                const hasChanged = readSelect.value !== "" && newId !== novel.status.id;
                if (hasChanged) {
                    loaderText.textContent = "Applying change...";
                    loaderDiv.classList.remove("hidden");

                    readLink.innerText = readSelect.selectedOptions[0].innerText;
                    await background.client.markChapterRead(novel.id, newId);
                    if (novel.manual !== undefined) {
                        await background.client.markChapterReadManual(novel.id, novel.manual, readLink.innerText);
                    }
                }

                readSelect.classList.add("hidden");
                readLink.classList.remove("hidden");
                editReadButton.classList.remove("hidden");

                if (hasChanged) {
                    await background.reloadReadingList();
                    await displayNovels();
                }
            };
            readCell.appendChild(readSelect);

            const nextCell = row.insertCell();
            nextCell.classList.add("novel-chapter");
            if (novel.next.length > 0) {
                nextCell.appendChild(makeChapterLink(novel.next[0]));
            }

            const latestCell = row.insertCell();
            latestCell.classList.add("novel-chapter");
            latestCell.appendChild(makeChapterLink(novel.latest));

            const actionsCell = row.insertCell();
            actionsCell.classList.add("novel-actions");

            if (hasNew) {
                const lastChapter = novel.chapters[novel.chapters.length - 1];
                const readLastButton = createIconButton("success", "check", "Mark last chapter as read");
                readLastButton.onclick = async () => {
                    loaderText.textContent = "Applying change...";
                    loaderDiv.classList.remove("hidden");

                    readLink.innerText = lastChapter.html || lastChapter.name;
                    await background.client.markChapterRead(novel.id, lastChapter.id);

                    await background.reloadReadingList();
                    await displayNovels();
                };
                actionsCell.appendChild(readLastButton);
            }
            const editReadButton = createIconButton("warning", "pencil", "Edit last read chapter manually");
            editReadButton.onclick = async () => {
                readLink.classList.add("hidden");
                editReadButton.classList.add("hidden");
                readSelect.classList.remove("hidden");
                readSelect.focus();
            };
            actionsCell.appendChild(editReadButton);
            const removeButton = createIconButton("danger", "trash-o", "Remove novel from reading list");
            removeButton.onclick = () => { removeNovel(novel.id); };
            actionsCell.appendChild(removeButton);
        }
    }

    updateRefreshLabel();
    loaderDiv.classList.add("hidden");
    novelsDiv.classList.remove("hidden");
}
function createIconButton(btnClass: string, iconClass: string, title: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "btn btn-xs btn-icon btn-" + btnClass;
    button.title = title;

    const icon = document.createElement("i");
    icon.classList.add("fa");
    icon.classList.add("fa-" + iconClass);
    button.appendChild(icon);

    return button;
}

// Settings page
openSettingsButton.onclick = async () => {
    settingsDiv.classList.remove("hidden");
};
settingsBack.onclick = () => {
    settingsDiv.classList.add("hidden");
};

// Button to refresh novel list
novelsRefreshButton.onclick = async () => {
    loaderText.textContent = "Refreshing novels...";
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
        searchResults.textContent = "Loading results...";
        const results = await background.client.search(val);
        if (val !== latestSearch) {
            return;
        }
        searchResults.textContent = "";
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
            nameCell.appendChild(makeLink(result.url, result.html || result.name));

            const actionsCell = row.insertCell();
            const addButton = document.createElement("button");
            addButton.className = "btn btn-xs btn-success btn-icon";
            addButton.onclick = () => { addNovel(result.url); };
            const plusIcon = document.createElement("i");
            plusIcon.classList.add("fa");
            plusIcon.classList.add("fa-plus");
            addButton.appendChild(plusIcon);
            actionsCell.appendChild(addButton);
            actionsCell.style.width = "0%";
        }
    }
};

// Store credentials on login form submit
loginForm.onsubmit = async (e) => {
    e.preventDefault();

    loaderText.textContent = "Logging in...";
    loaderDiv.classList.remove("hidden");

    if (await background.tryLogin(loginUsername.value, loginPassword.value)) {
        loginFormError.classList.add("hidden");
        loginDiv.classList.add("hidden");

        await background.reloadReadingList();
        await displayNovels();
    } else {
        loginFormError.textContent = "Login failure";
        loginFormError.classList.remove("hidden");

        loaderDiv.classList.add("hidden");
    }

    return false;
};

// Show novels or login form on popup load
(async () => {
    if (await background.checkLoginStatus()) {
        loaderText.textContent = "Loading reading list...";
        await displayNovels();
    } else {
        loaderDiv.classList.add("hidden");
        loginDiv.classList.remove("hidden");
    }
})();
