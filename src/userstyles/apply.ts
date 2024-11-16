(async () => {
    const domains = [
        "webnovel.com",
        "wuxiaworld.com",
    ];

    const isSidebar = await browser.runtime.sendMessage({ type: "check-is-sidebar" });
    const isEnabled = await browser.runtime.sendMessage({ type: "get-setting", key: "customCss" });

    if (isSidebar && isEnabled) {
        for (const domain of domains) {
            if (location.hostname.includes(domain)) {
                document.addEventListener("DOMContentLoaded", () => {
                    const head = document.getElementsByTagName("head")[0];
                    const link = document.createElement("link");
                    link.setAttribute("rel", "stylesheet");
                    link.setAttribute("type", "text/css");
                    link.setAttribute("href", browser.runtime.getURL("src/userstyles/css/" + domain + ".css"));
                    head.appendChild(link);
                });
            }
        }
    }
})();
