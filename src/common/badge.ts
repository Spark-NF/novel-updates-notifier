export async function setBadge(text: string, background: string, color: string): Promise<void> {
    const browserAction = browser.browserAction;
    if (browserAction) {
        await browserAction.setBadgeText({ text });
        if (browserAction.setBadgeBackgroundColor) {
            await browserAction.setBadgeBackgroundColor({ color: background });
        }
        if (browserAction.setBadgeTextColor) {
            await browserAction.setBadgeTextColor({ color });
        }
    }
}
