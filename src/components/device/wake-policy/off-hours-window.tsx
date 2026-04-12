'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    TimePicker,
    TimePickerContent,
    TimePickerHour,
    TimePickerInput,
    TimePickerInputGroup,
    TimePickerMinute,
    TimePickerSeparator,
} from '@/components/ui/time-picker';
import { Toggle } from '@/components/ui/toggle';
import type { DeviceOffHoursWindow } from '@/lib/deviceWakePolicy';
import { cn } from '@/lib/utils';
import { DAY_MINUTES, DAY_OPTIONS } from '@/components/device/wake-policy/constants';
import { minutesToTimeString, timeStringToMinutes } from '@/components/device/wake-policy/time';

type OffHoursWindowProps = {
    index: number;
    window: DeviceOffHoursWindow;
    showRemove: boolean;
    onUpdate: (patch: Partial<DeviceOffHoursWindow>) => void;
    onRemove: () => void;
    toggleDay: (day: number) => void;
};

export function OffHoursWindow({ index, window, showRemove, onUpdate, onRemove, toggleDay }: OffHoursWindowProps) {
    const isEndAtMidnight = window.endMinute >= 1440;
    const hasError = !isEndAtMidnight && window.endMinute <= window.startMinute;

    return (
        <div className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">Window {index + 1}</span>
                {showRemove && (
                    <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-7 text-xs">
                        Remove
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap gap-1">
                {DAY_OPTIONS.map((day) => {
                    const selected = window.days.includes(day.value);
                    return (
                        <Toggle
                            key={day.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            pressed={selected}
                            onPressedChange={() => toggleDay(day.value)}
                            className={cn(
                                'h-7 rounded px-2.5 text-xs',
                                selected
                                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground aria-pressed:!bg-primary data-[state=on]:!bg-primary'
                                    : 'bg-background text-muted-foreground hover:border-foreground/30',
                            )}
                        >
                            {day.label}
                        </Toggle>
                    );
                })}
            </div>

            <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <TimePicker
                        value={minutesToTimeString(window.startMinute)}
                        onValueChange={(val) => onUpdate({ startMinute: timeStringToMinutes(val) })}
                        openOnFocus
                        locale="en-GB"
                    >
                        <TimePickerInputGroup className="h-8 w-28 text-sm">
                            <TimePickerInput segment="hour" className="text-sm" />
                            <TimePickerSeparator />
                            <TimePickerInput segment="minute" className="text-sm" />
                        </TimePickerInputGroup>
                        <TimePickerContent>
                            <TimePickerHour format="2-digit" />
                            <TimePickerMinute />
                        </TimePickerContent>
                    </TimePicker>
                </div>

                <span className="pb-1.5 text-muted-foreground text-sm">–</span>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <TimePicker
                        value={isEndAtMidnight ? '23:59' : minutesToTimeString(window.endMinute)}
                        onValueChange={(val) => onUpdate({ endMinute: timeStringToMinutes(val) })}
                        openOnFocus
                        locale="en-GB"
                        disabled={isEndAtMidnight}
                    >
                        <TimePickerInputGroup className="h-8 w-28 text-sm">
                            <TimePickerInput segment="hour" className="text-sm" />
                            <TimePickerSeparator />
                            <TimePickerInput segment="minute" className="text-sm" />
                        </TimePickerInputGroup>
                        <TimePickerContent>
                            <TimePickerHour format="2-digit" />
                            <TimePickerMinute />
                        </TimePickerContent>
                    </TimePicker>
                </div>

                <div className="pb-1.5 flex items-center gap-1.5">
                    <Switch
                        id={`midnight-${index}`}
                        checked={isEndAtMidnight}
                        onCheckedChange={(checked) => onUpdate({ endMinute: checked ? DAY_MINUTES : DAY_MINUTES - 1 })}
                        className="scale-75"
                    />
                    <Label htmlFor={`midnight-${index}`} className="text-xs text-muted-foreground cursor-pointer">
                        Midnight
                    </Label>
                </div>
            </div>

            {hasError && (
                <p className="text-xs text-destructive">
                    End must be after start. For overnight ranges, split into two windows.
                </p>
            )}
        </div>
    );
}
