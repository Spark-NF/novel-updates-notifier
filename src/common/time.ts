export function secondsToString(seconds: number, showHours: boolean): string {
    const negative = seconds < 0;
    const minus = negative ? "-" : "";

    const secs = Math.abs(seconds);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);

    if (showHours) {
        const strHours = hours.toString();
        const strMins = (mins % 60).toString().padStart(2, "0");
        const strSecs = (secs % 60).toString().padStart(2, "0");
        return `${minus}${strHours}:${strMins}:${strSecs}`;
    } else {
        const strMins = mins.toString();
        const strSecs = (secs % 60).toString().padStart(2, "0");
        return `${minus}${strMins}:${strSecs}`;
    }
}
