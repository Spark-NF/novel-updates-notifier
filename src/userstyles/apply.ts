const domains = [
    "webnovel.com",
    "wuxiaworld.com",
];

document.addEventListener("DOMContentLoaded", () => {
    for (const domain of domains) {
        if (location.hostname.includes(domain)) {
            const head = document.getElementsByTagName("head")[0];
            const link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("href", browser.extension.getURL("src/userstyles/css/" + domain + ".css"));
            head.appendChild(link);
        }
    }
});
