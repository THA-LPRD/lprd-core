export function secondsToHours(seconds: number) {
    return Math.round((seconds / 3600) * 100) / 100;
}

export function hoursToSeconds(hours: number) {
    if (!Number.isFinite(hours)) return 3600;
    return Math.max(1, Math.round(hours * 3600));
}

export function minutesToTimeString(minutes: number): string {
    const clamped = Math.max(0, Math.min(minutes, 1439));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeStringToMinutes(timeString: string): number {
    const parts = timeString.split(':');
    const h = Number.parseInt(parts[0] ?? '0', 10);
    const m = Number.parseInt(parts[1] ?? '0', 10);
    return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}
