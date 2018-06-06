const background = browser.extension.getBackgroundPage();

const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const loginDiv = document.getElementById("login-form");
const loginForm = loginDiv.getElementsByTagName("form")[0];
const loginFormError = document.getElementById("login-error");
const novelsDiv = document.getElementById("novel-list");
const novelsTable = novelsDiv.getElementsByTagName("table")[0];
const novelsRefreshButton = document.getElementById("refresh-novel-list");
const searchInput = document.getElementById("search").getElementsByTagName("input")[0];
const searchResults = document.getElementById("search-results");

async function removeNovel(id) {
	await background.removeFromList(id);
	const element = document.getElementById("novel-row-" + id);
	element.parentElement.removeChild(element);
}

async function displayNovels() {
	const novels = await background.getReadingList();

	// Empty the novels table first
	var rowCount = novelsTable.rows.length;
	while (--rowCount > 0) {
		novelsTable.deleteRow(rowCount);
	}

	// Populate the table
	for (const novel of novels) {
		const row = novelsTable.insertRow();
		row.id = "novel-row-" + novel.id;
		if (novel.status.id != novel.latest.id) {
			row.classList.add("table-warning");
		}
		const nameCell = row.insertCell();
		nameCell.innerHTML = novel.name;
		const readCell = row.insertCell();
		readCell.innerHTML = novel.status.name; //https://www.novelupdates.com/readinglist_getchp.php?rid=1580010&sid=880&nrid=4848
		const nextCell = row.insertCell();
		const latestCell = row.insertCell();
		latestCell.innerHTML = novel.latest.name;
		const actionsCell = row.insertCell();
		actionsCell.innerHTML = `<button class="btn btn-xs btn-danger" onclick="removeNovel("${novel.id}");">X</button>`;
	}

	loaderDiv.classList.add("hidden");
	novelsDiv.classList.remove("hidden");
}

// Button to refresh novel list
novelsRefreshButton.onclick = async function() {
	loaderText.innerHTML = "Refreshing novels...";
	loaderDiv.classList.remove("hidden");

	await background.reloadReadingList();
	await displayNovels();
};

// Show search results input change
var latestSearch = "";
searchInput.oninput = async function() {
	const val = this.value.trim();
	latestSearch = val;
	if (val.length === 0) {
		searchResults.innerHTML = "";
	} else {
		searchResults.innerHTML = "Loading results...";
		const results = await background.search(this.value);
		if (val !== latestSearch) {
			return;
		}
		searchResults.innerHTML = "";
		for (var i = 0; i < 5 && i < results.length; ++i) {
			const result = results[i];
			var li = document.createElement('li');
			li.innerHTML = result.name;
			searchResults.appendChild(li);
		}
	}
};

// Store credentials on login form submit
loginForm.onsubmit = async function(e) {
	e.preventDefault();

	loaderText.innerHTML = "Logging in...";
	loaderDiv.classList.remove("hidden");

	await background.setSettings({
		username: document.getElementsByName("username")[0].value,
		password: document.getElementsByName("password")[0].value,
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
(async function() {
	if (await background.checkLoginStatus()) {
		loaderText.innerHTML = "Loading reading list...";
		await displayNovels();
	} else {
		loaderDiv.classList.add("hidden");
		loginDiv.classList.remove("hidden");
	}
})();