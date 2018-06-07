const background = browser.extension.getBackgroundPage() as any;

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
const openSettingsButton = document.getElementById("open-settings");

async function removeNovel(id: number) {
    await background.removeFromList(id);
    const element = document.getElementById("novel-row-" + id);
    element.parentElement.removeChild(element);
}
async function addNovel(url: string) {
    loaderText.innerHTML = "Getting novel ID...";
    loaderDiv.classList.remove("hidden");
    searchInput.value = "";
    searchResults.classList.add("hidden");
    const id = await background.getIdFromUrl(url);

    loaderText.innerHTML = "Adding novel...";
    await background.putInList(id, 0);

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
        const readCell = row.insertCell();
        readCell.appendChild(makeLink(novel.status.url, novel.status.name));
        const nextCell = row.insertCell();
        if (novel.next.length > 0) {
            nextCell.appendChild(makeLink(novel.next[0].url, novel.next[0].name));
        }
        const latestCell = row.insertCell();
        latestCell.appendChild(makeLink(novel.latest.url, novel.latest.name));
        const actionsCell = row.insertCell();
        const removeButton = document.createElement("button");
        removeButton.className = "btn btn-xs btn-danger";
        removeButton.onclick = () => { removeNovel(novel.id); };
        removeButton.innerHTML = '<i class="fa fa-trash-o"></i>';
        actionsCell.appendChild(removeButton);
        actionsCell.style.width = "0%";
    }

    loaderDiv.classList.add("hidden");
    novelsDiv.classList.remove("hidden");
}

// Settings page
openSettingsButton.onclick = async () => {
    const settings = await background.getSettings();
    settingsInterval.value = settings.interval;
    settingsNotifications.checked = settings.notifications;
    settingsDiv.classList.remove("hidden");
};
settingsForm.onsubmit = async () => {
    await background.setSettings({
        interval: parseInt(settingsInterval.value, 10),
        notifications: !!settingsNotifications.checked,
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
        const results = await background.search(val);
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
            addButton.className = "btn btn-xs btn-success";
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

    await background.setSettings({
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
    if (await background.checkLoginStatus()) {
        loaderText.innerHTML = "Loading reading list...";
        await displayNovels();
    } else {
        loaderDiv.classList.add("hidden");
        loginDiv.classList.remove("hidden");
    }
})();
