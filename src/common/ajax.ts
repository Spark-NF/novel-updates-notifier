export function objectToParams(obj: any): string {
    let str = "";
    if (typeof obj === "object") {
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== undefined && typeof obj[key] !== "object") {
                if (str !== "") {
                    str += "&";
                }
                str += key + "=" + encodeURIComponent(obj[key]);
            }
        }
    }
    return str;
}

export function ajax(url: string, method?: "GET" | "POST", data?: any, contentType?: string): Promise<XMLHttpRequest> {
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
