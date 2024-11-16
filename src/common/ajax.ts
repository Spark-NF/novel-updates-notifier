import { clone } from "./clone";

export function objectToParams(obj: any): string {
    let str = "";
    if (typeof obj === "object") {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined && typeof obj[key] !== "object") {
                if (str !== "") {
                    str += "&";
                }
                str += key + "=" + encodeURIComponent(obj[key]);
            }
        }
    }
    return str;
}

export async function syncPartitionedCookies(url: string): Promise<void> {
    /**
     * Clone partitioned cookies as non-partitioned to allow access in XHR / fetch calls.
     * @see https://github.com/Spark-NF/novel-updates-notifier/issues/32
     */
    const nonPartitionedCookies = await browser.cookies.getAll({url});
    const nonPartitionedCookieNames = nonPartitionedCookies.map(cookie => cookie.name)
    const allCookies = await browser.cookies.getAll({url, partitionKey: {}});

    for (const cookie of allCookies) {
        if (!nonPartitionedCookieNames.includes(cookie.name)) {
            const copy = clone(cookie) as any;
            for (const key of ["partitionKey", "hostOnly", "session"]) {
                delete copy[key];
            }
            await browser.cookies.set({ url, ...copy });
            console.debug("Cloned partitioned cookie", cookie.name);
        }
    }
}

export function ajaxXHR(url: string, method?: "GET" | "POST", data?: any, contentType?: string): Promise<XMLHttpRequest> {
    return new Promise<XMLHttpRequest>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
            resolve(this);
        };
        xhr.onerror = () => reject("A network error occurred");
        xhr.ontimeout = () => reject("A network timeout occurred");
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

export async function ajax(url: string, method?: "GET" | "POST", data?: any, contentType?: string): Promise<XMLHttpRequest> {
    await syncPartitionedCookies(url);
    return ajaxXHR(url, method, data, contentType);
}
