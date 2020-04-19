export function tr(messageName: string, substitutions?: any[] | any): string {
    return browser.i18n.getMessage(messageName, substitutions);
}
