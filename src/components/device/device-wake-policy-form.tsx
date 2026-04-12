'use client';

import * as React from 'react';
import { OffHoursWindow } from '@/components/device/wake-policy/off-hours-window';
import { SleepIntervalField } from '@/components/device/wake-policy/sleep-interval-field';
import { DEFAULT_WINDOW } from '@/components/device/wake-policy/constants';
import { hoursToSeconds, secondsToHours } from '@/components/device/wake-policy/time';
import { TimezoneCombobox } from '@/components/device/wake-policy/timezone-combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { DeviceOffHoursWindow, DeviceWakePolicy } from '@/lib/deviceWakePolicy';

type DeviceWakePolicyFormProps = {
    value: DeviceWakePolicy;
    onChange: (value: DeviceWakePolicy) => void;
};

type SleepSecondsKey = keyof Pick<
    DeviceWakePolicy,
    'staleDataRetrySeconds' | 'missingDataRetrySeconds' | 'unboundRefreshSeconds' | 'maxFreshDataSleepSeconds'
>;

export function DeviceWakePolicyForm({ value, onChange }: DeviceWakePolicyFormProps) {
    const policy = value;
    const windows = policy.offHoursWindows;

    const updatePolicy = (patch: Partial<DeviceWakePolicy>) => {
        onChange({ ...policy, ...patch });
    };

    const updateSeconds = (key: SleepSecondsKey) => {
        return (event: React.ChangeEvent<HTMLInputElement>) => {
            updatePolicy({ [key]: hoursToSeconds(event.target.valueAsNumber) });
        };
    };

    const updateWindow = (index: number, patch: Partial<DeviceOffHoursWindow>) => {
        const nextWindows = windows.map((window, windowIndex) =>
            windowIndex === index ? { ...window, ...patch } : window,
        );
        updatePolicy({ offHoursWindows: nextWindows });
    };

    const addWindow = () => {
        updatePolicy({
            offHoursWindows: [
                ...windows,
                {
                    ...DEFAULT_WINDOW,
                    days: [...DEFAULT_WINDOW.days],
                },
            ],
        });
    };

    const removeWindow = (index: number) => {
        updatePolicy({ offHoursWindows: windows.filter((_, windowIndex) => windowIndex !== index) });
    };

    const toggleDay = (window: DeviceOffHoursWindow, day: number) => {
        const days = window.days.includes(day)
            ? window.days.filter((current) => current !== day)
            : [...window.days, day];

        return days.sort((a, b) => a - b);
    };

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-muted-foreground mb-3">
                    How long the device sleeps before waking to check for new content.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <SleepIntervalField
                        id="stale-retry"
                        label="Stale data retry"
                        hint="Plugin data has expired"
                        value={secondsToHours(policy.staleDataRetrySeconds)}
                        onChange={updateSeconds('staleDataRetrySeconds')}
                    />
                    <SleepIntervalField
                        id="missing-retry"
                        label="Missing data retry"
                        hint="Binding has no data yet"
                        value={secondsToHours(policy.missingDataRetrySeconds)}
                        onChange={updateSeconds('missingDataRetrySeconds')}
                    />
                    <SleepIntervalField
                        id="unbound-refresh"
                        label="Static refresh"
                        hint="No expiring plugin data"
                        value={secondsToHours(policy.unboundRefreshSeconds)}
                        onChange={updateSeconds('unboundRefreshSeconds')}
                    />
                    <SleepIntervalField
                        id="fresh-cap"
                        label="Fresh data cap"
                        hint="Maximum sleep regardless of TTL"
                        value={secondsToHours(policy.maxFreshDataSleepSeconds)}
                        onChange={updateSeconds('maxFreshDataSleepSeconds')}
                    />
                </div>
            </div>

            <div className="rounded-lg border divide-y">
                <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                        <p className="text-sm font-medium">Off-hours schedule</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Device stays asleep during these windows.
                        </p>
                    </div>
                    <Switch
                        id="off-hours-enabled"
                        checked={policy.offHoursEnabled}
                        onCheckedChange={(checked) => updatePolicy({ offHoursEnabled: checked })}
                    />
                </div>

                {policy.offHoursEnabled && (
                    <div className="p-4 space-y-4">
                        <div className="grid gap-2 max-w-xs">
                            <Label htmlFor="off-hours-timezone">Timezone</Label>
                            <TimezoneCombobox
                                id="off-hours-timezone"
                                value={policy.offHoursTimezone}
                                onChange={(timezone) => updatePolicy({ offHoursTimezone: timezone })}
                            />
                            <p className="text-xs text-muted-foreground">Times are evaluated in this timezone.</p>
                        </div>

                        <div className="space-y-3">
                            {windows.map((window, index) => (
                                <OffHoursWindow
                                    key={index}
                                    index={index}
                                    window={window}
                                    showRemove={windows.length > 1}
                                    onUpdate={(patch) => updateWindow(index, patch)}
                                    onRemove={() => removeWindow(index)}
                                    toggleDay={(day) => updateWindow(index, { days: toggleDay(window, day) })}
                                />
                            ))}

                            <Button type="button" variant="outline" size="sm" onClick={addWindow}>
                                Add window
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
