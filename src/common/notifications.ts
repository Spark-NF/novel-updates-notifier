export async function notify(title: string, message: string): Promise<string> {
    return browser.notifications.create({
        type: "basic" as any,
        iconUrl: browser.extension.getURL("icons/icon-48.png"),
        title,
        message,
    });
}
