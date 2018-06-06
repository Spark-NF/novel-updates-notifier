const background = browser.extension.getBackgroundPage();

const loaderDiv = document.getElementById("loader");
const loaderText = loaderDiv.getElementsByTagName("span")[0];
const loginDiv = document.getElementById("login-form");
const loginForm = loginDiv.getElementsByTagName("form")[0];
const loginFormError = document.getElementById("login-error");
const novelsDiv = document.getElementById("novel-list");
const novelsTable = novelsDiv.getElementsByTagName("table")[0];

async function displayNovels() {
	const novels = await background.getReadingList();

	for (const novel of novels) {
		const row = novelsTable.insertRow();
		const nameCell = row.insertCell();
		nameCell.innerHTML = (novel.status.id != novel.latest.id ? "!!! " : "") + novel.name;
		const readCell = row.insertCell();
		readCell.innerHTML = novel.status.name; //https://www.novelupdates.com/readinglist_getchp.php?rid=1580010&sid=880&nrid=4848
		const nextCell = row.insertCell();
		const latestCell = row.insertCell();
		latestCell.innerHTML = novel.latest.name;
	}

	loaderDiv.classList.add("hidden");
	novelsDiv.classList.remove("hidden");
}

(async function() {
	if (await background.checkLoginStatus()) {
		loaderText.innerHTML = "Loading reading list...";
		await displayNovels();
	} else {
		loaderDiv.classList.add("hidden");
		loginDiv.classList.remove("hidden");
	}

	// Store credentials on login form submit
	loginForm.onsubmit = async function(e) {
		e.preventDefault();

		loaderText.innerHTML = "Logging in...";
		loaderDiv.classList.remove("hidden");
		loginDiv.classList.add("hidden");

		await background.setSettings({
			username: document.getElementsByName("username")[0].value,
			password: document.getElementsByName("password")[0].value,
		});

		if (await background.tryLogin()) {
			loginFormError.classList.add("hidden");

			await background.reloadReadingList();
			await displayNovels();
		} else {
			loginFormError.innerHTML = "Login failure";
			loginFormError.classList.remove("hidden");

			loaderDiv.classList.add("hidden");
			loginDiv.classList.remove("hidden");
		}

		return false;
	}
})();