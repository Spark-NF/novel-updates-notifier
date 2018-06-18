document.addEventListener("DOMContentLoaded", () => {

    if (location.hostname.includes("webnovel.com")) {
        const head = document.getElementsByTagName("head")[0];
        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("type", "text/css");
        link.setAttribute("href", browser.extension.getURL("src/userstyles/css/webnovel.com.css"));
        head.appendChild(link);
    }

});
