// Async sleep helper
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Ajax helper
function objectToParams(obj) {
	let str = "";
	for (const key in obj) {
		if (str != "") {
			str += "&";
		}
		str += key + "=" + encodeURIComponent(obj[key]);
	}
	return str;
}
function ajax(url, method, data, contentType) {
    return new Promise(function(resolve, reject) {
		const xhr = new XMLHttpRequest();
		xhr.onload = function() {
			resolve(this);
		}
        xhr.onerror = reject;
		xhr.open(method || "GET", url, true);
		if (contentType) {
			xhr.setRequestHeader("Content-type", contentType);
		} else if (method === "POST") {
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		}
		if (method === "POST") {
			xhr.send(typeof data === "object" ? objectToParams(data) : data);
		} else {
			xhr.send();
		}
    });
}

// Storage methods
/*var store = browser.storage.sync;
try {
	store.get(null)
} catch (e) {
	store = browser.storage.local;
}*/
var store = browser.storage.local;
async function setSettings(values) {
	return await store.set(values);
}
async function getSettings() {
	return await store.get(null);
}

// Perform a series search
async function search(name) {
	const rq = await ajax("https://www.novelupdates.com/wp-admin/admin-ajax.php", "POST", {
		action: "nd_ajaxsearchmain",
		strType: "desktop",
		strOne: name
	});
	const parser = new DOMParser();
	const xml = parser.parseFromString(rq.responseText, "text/html");
	const links = xml.getElementsByClassName("a_search");

	const results = [];
	for (const link of links) {
		const img = link.getElementsByTagName("img")[0];
		const name = link.getElementsByTagName("span")[0];
		results.push({
			name: name.innerHTML.trim(),
			url: link.href,
			img: img.src,
		});
	}

	return results;
}

// Check if we are logged in
async function checkLoginStatus() {
	const cookies = await browser.cookies.getAll({ url: "https://www.novelupdates.com" });
	for (const cookie of cookies) {
		if (cookie.name.startsWith("wordpress_logged_in")) {
			return true;
		}
	}

	browser.browserAction.setBadgeText({ text: "OFF" });
	browser.browserAction.setBadgeBackgroundColor({ 'color': 'orange' });
	return false;
}

// Send login request
function login(username, password) {
	return ajax("https://www.novelupdates.com/login/", "POST", {
		log: username,
		pwd: password,
	});
}
async function tryLogin() {
	const settings = await getSettings();
	if (!settings || !settings.username || !settings.password) {
		return false;
	}
	login(settings.username, settings.password);
	for (var i = 0; i < 30; ++i) {
		if (await checkLoginStatus()) {
			return true;
		}
		await sleep(100);
	}
	return false;
}

// Get the status of novels in the user's reading list
async function loadReadingList() {
	if (!await checkLoginStatus()) {
		return;
	}

	const rq = await ajax("https://www.novelupdates.com/reading-list/");
	const parser = new DOMParser();
	const xml = parser.parseFromString(rq.responseText, "text/html");
	const rows = xml.getElementsByClassName("rl_links");

	const novels = [];
	let novelsWithChanges = 0;

	for (const row of rows) {
		const cells = row.getElementsByTagName("td");
		const checkboxInput = cells[0].getElementsByTagName("input")[0];
		const novelLink = cells[1].getElementsByTagName("a")[0];
		const statusLink = cells[2].getElementsByTagName("a")[0];
		const latestIdInput = cells[2].getElementsByTagName("input")[0];
		const latestLink = cells[3].getElementsByTagName("a")[0];

		const novel = {
			id: parseInt(row.dataset.sid, 10),
			name: row.dataset.title,
			url: novelLink.href,
			status: {
				id: parseInt(checkboxInput.value.substr(0, checkboxInput.value.indexOf(":")), 10),
				name: statusLink.innerHTML,
				url: statusLink.href,
			},
			latest: {
				id: parseInt(latestIdInput.value, 10),
				name: latestLink.innerHTML,
				url: latestLink.href,
			},
		};

		if (novel.status.id !== novel.latest.id) {
			novelsWithChanges++;
		}
		novels.push(novel);
	}

	browser.browserAction.setBadgeText({ text: novelsWithChanges > 0 ? novelsWithChanges.toString() : "" });
	browser.browserAction.setBadgeBackgroundColor({ 'color': 'red' });

	return novels;
}

// Reading list accessor
async function reloadReadingList() {
	window.readingList = await loadReadingList();
}
async function getReadingList() {
	if (window.readingList === undefined) {
		await reloadReadingList();
	}
	return window.readingList;
}
setInterval(reloadReadingList, 5 * 60 * 1000);

// Initial load
(async function() {
	if (await checkLoginStatus() || await tryLogin()) {
		reloadReadingList();
	}
})();
