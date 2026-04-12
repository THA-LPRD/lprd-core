const COMMON_TIMEZONE_GROUPS = [
    {
        label: 'North America',
        values: [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Anchorage',
            'Pacific/Honolulu',
            'America/Toronto',
            'America/Vancouver',
        ],
    },
    {
        label: 'Europe & Africa',
        values: [
            'UTC',
            'Europe/London',
            'Europe/Berlin',
            'Europe/Paris',
            'Europe/Istanbul',
            'Europe/Athens',
            'Africa/Johannesburg',
            'Africa/Nairobi',
        ],
    },
    {
        label: 'Asia',
        values: [
            'Europe/Moscow',
            'Asia/Dubai',
            'Asia/Kolkata',
            'Asia/Shanghai',
            'Asia/Tokyo',
            'Asia/Seoul',
            'Asia/Singapore',
        ],
    },
    {
        label: 'Australia & Pacific',
        values: ['Australia/Perth', 'Australia/Adelaide', 'Australia/Sydney', 'Pacific/Auckland', 'Pacific/Fiji'],
    },
    {
        label: 'South America',
        values: ['America/Argentina/Buenos_Aires', 'America/La_Paz', 'America/Sao_Paulo', 'America/Santiago'],
    },
] as const;

export type TimezoneOption = {
    value: string;
    label: string;
    group: string;
};

export function isValidTimezone(timezone: string) {
    if (!timezone.trim()) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function timezoneOffsetLabel(timezone: string) {
    try {
        return (
            new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                timeZoneName: 'shortOffset',
            })
                .formatToParts(new Date())
                .find((part) => part.type === 'timeZoneName')?.value ?? ''
        );
    } catch {
        return '';
    }
}

export function timezoneLabel(timezone: string) {
    const offset = timezoneOffsetLabel(timezone);
    return offset ? `${timezone} (${offset})` : timezone;
}

function timezoneRegion(timezone: string) {
    if (timezone === 'UTC') return 'UTC';
    const region = timezone.split('/')[0];
    if (region === 'America') return 'Americas';
    if (region === 'Europe' || region === 'Africa') return 'Europe & Africa';
    if (region === 'Asia') return 'Asia';
    if (region === 'Australia' || region === 'Pacific' || region === 'Antarctica') return 'Australia & Pacific';
    return 'Other';
}

function supportedTimezones() {
    const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return Array.from(new Set(['UTC', ...supported])).sort((a, b) => a.localeCompare(b));
}

function buildTimezoneOptions() {
    const common = new Set<string>(COMMON_TIMEZONE_GROUPS.flatMap((group) => [...group.values]));
    const grouped = COMMON_TIMEZONE_GROUPS.flatMap((group) =>
        group.values.map((value) => ({
            value,
            label: timezoneLabel(value),
            group: group.label,
        })),
    );
    const remaining = supportedTimezones()
        .filter((value) => !common.has(value))
        .map((value) => ({
            value,
            label: timezoneLabel(value),
            group: timezoneRegion(value),
        }));

    return [...grouped, ...remaining].filter((option, index, options) => {
        return options.findIndex((candidate) => candidate.value === option.value) === index;
    });
}

export const TIMEZONE_OPTIONS = buildTimezoneOptions();
