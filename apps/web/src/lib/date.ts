type TimestampFormat = 'long' | 'short' | 'dateOnly' | 'compactWithSeconds';
type CalendarDayFormat = 'weekdayDate' | 'weekday';

const timestampFormats: Record<TimestampFormat, Intl.DateTimeFormatOptions> = {
    long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    },
    short: {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    },
    dateOnly: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    },
    compactWithSeconds: {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    },
};

const calendarDayFormats: Record<CalendarDayFormat, Intl.DateTimeFormatOptions> = {
    weekdayDate: {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    },
    weekday: {
        weekday: 'short',
    },
};

export function formatTimestamp(timestamp: number, format: TimestampFormat = 'long'): string {
    return new Date(timestamp).toLocaleString(undefined, timestampFormats[format]);
}

export function formatDate(timestamp: number): string {
    return formatTimestamp(timestamp, 'long');
}

export function formatCalendarDay(date: string, format: CalendarDayFormat = 'weekdayDate'): string {
    return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, calendarDayFormats[format]);
}

export function formatDurationSeconds(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

export function formatElapsedMilliseconds(ms: number): string {
    if (ms < 1_000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;

    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1_000);
    return `${minutes}m ${seconds}s`;
}

export function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return formatDate(timestamp);
}
