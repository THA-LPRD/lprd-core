import type { DeviceOffHoursWindow } from '@/lib/deviceWakePolicy';

export const DAY_OPTIONS = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
];

export const DEFAULT_WINDOW: DeviceOffHoursWindow = {
    days: [1, 2, 3, 4, 5],
    startMinute: 18 * 60,
    endMinute: 24 * 60,
};

export const DAY_MINUTES = 24 * 60;
