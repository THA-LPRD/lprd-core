import type { Infer } from 'convex/values';
import type { deviceOffHoursWindow, deviceWakePolicy } from '../schema';

export type DeviceOffHoursWindow = Infer<typeof deviceOffHoursWindow>;
export type DeviceWakePolicy = Infer<typeof deviceWakePolicy>;

export type DeviceWakeReason = 'fresh_data' | 'stale_data' | 'missing_data' | 'unbound' | 'off_hours';

export type DeviceDataFreshness =
    | { kind: 'fresh'; secondsUntilExpiry: number | null }
    | { kind: 'stale' }
    | { kind: 'missing' }
    | { kind: 'unbound' };

export type DeviceWakePlan = {
    validForSeconds: number;
    reason: DeviceWakeReason;
};

const DAY_MINUTES = 24 * 60;
const WEEK_MINUTES = 7 * DAY_MINUTES;
const FALLBACK_TIMEZONE = 'UTC';
const WEEKDAY_TO_DAY: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

export const DEFAULT_DEVICE_WAKE_POLICY: DeviceWakePolicy = {
    staleDataRetrySeconds: 6 * 60 * 60,
    missingDataRetrySeconds: 6 * 60 * 60,
    unboundRefreshSeconds: 12 * 60 * 60,
    maxFreshDataSleepSeconds: 24 * 60 * 60,
    offHoursEnabled: false,
    offHoursTimezone: 'UTC',
    offHoursWindows: [
        { days: [0, 1, 2, 3, 4, 5, 6], startMinute: 22 * 60, endMinute: DAY_MINUTES },
        { days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 6 * 60 },
    ],
};

export function createDefaultDeviceWakePolicy(
    timezone = DEFAULT_DEVICE_WAKE_POLICY.offHoursTimezone,
): DeviceWakePolicy {
    return {
        ...DEFAULT_DEVICE_WAKE_POLICY,
        offHoursTimezone: timezone,
        offHoursWindows: DEFAULT_DEVICE_WAKE_POLICY.offHoursWindows.map((window) => ({
            ...window,
            days: [...window.days],
        })),
    };
}

function safeTimezone(timezone: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
        return timezone;
    } catch {
        return FALLBACK_TIMEZONE;
    }
}

function getLocalWeekTime(timezone: string, nowMs: number) {
    const now = new Date(nowMs);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: safeTimezone(timezone),
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
    const day = WEEKDAY_TO_DAY[parts.weekday ?? ''] ?? now.getUTCDay();
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    const second = Number(parts.second);

    return {
        weekMinute:
            day * DAY_MINUTES + (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
        second: Number.isFinite(second) ? second : 0,
    };
}

export function getOffHoursSleepSeconds(policy: DeviceWakePolicy, nowMs: number) {
    if (!policy.offHoursEnabled || policy.offHoursWindows.length === 0) return null;

    const { weekMinute: currentWeekMinute, second } = getLocalWeekTime(policy.offHoursTimezone, nowMs);

    const intervals = policy.offHoursWindows
        .flatMap((w) =>
            w.days.map((day) => ({ start: day * DAY_MINUTES + w.startMinute, end: day * DAY_MINUTES + w.endMinute })),
        )
        .sort((a, b) => a.start - b.start);

    let sleepUntilWeekMinute: number | null = null;

    for (const iv of intervals) {
        for (const offset of [0, WEEK_MINUTES]) {
            const start = iv.start + offset;
            const end = iv.end + offset;
            if (currentWeekMinute >= start && currentWeekMinute < end) {
                sleepUntilWeekMinute = Math.max(sleepUntilWeekMinute ?? 0, end);
            }
        }
    }

    if (sleepUntilWeekMinute === null) return null;

    for (const iv of intervals) {
        for (const offset of [0, WEEK_MINUTES]) {
            const start = iv.start + offset;
            const end = iv.end + offset;
            if (start <= sleepUntilWeekMinute && end > sleepUntilWeekMinute) {
                sleepUntilWeekMinute = end;
            }
        }
    }

    return (sleepUntilWeekMinute - currentWeekMinute) * 60 - second;
}

export function resolveDeviceWakePlan(input: {
    policy: DeviceWakePolicy;
    freshness: DeviceDataFreshness;
    nowMs: number;
}): DeviceWakePlan {
    const policy = input.policy;
    const offHoursSleepSeconds = getOffHoursSleepSeconds(policy, input.nowMs);

    if (offHoursSleepSeconds !== null) {
        return { validForSeconds: offHoursSleepSeconds, reason: 'off_hours' };
    }

    if (input.freshness.kind === 'missing') {
        return { validForSeconds: policy.missingDataRetrySeconds, reason: 'missing_data' };
    }

    if (input.freshness.kind === 'stale') {
        return { validForSeconds: policy.staleDataRetrySeconds, reason: 'stale_data' };
    }

    if (input.freshness.kind === 'unbound') {
        return { validForSeconds: policy.unboundRefreshSeconds, reason: 'unbound' };
    }

    if (input.freshness.secondsUntilExpiry === null) {
        return { validForSeconds: policy.unboundRefreshSeconds, reason: 'fresh_data' };
    }

    return {
        validForSeconds: Math.max(1, Math.min(input.freshness.secondsUntilExpiry, policy.maxFreshDataSleepSeconds)),
        reason: 'fresh_data',
    };
}
