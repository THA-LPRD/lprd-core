'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
    isValidTimezone,
    TIMEZONE_OPTIONS,
    timezoneLabel,
    type TimezoneOption,
} from '@/components/device/wake-policy/timezone-options';

type TimezoneComboboxProps = {
    id: string;
    value: string;
    onChange: (timezone: string) => void;
};

export function TimezoneCombobox({ id, value, onChange }: TimezoneComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const trimmedQuery = query.trim();
    const valueIsValid = isValidTimezone(value);
    const selectedLabel = valueIsValid ? timezoneLabel(value) : value || 'Select a timezone';

    const filteredOptions = React.useMemo(() => {
        const normalizedQuery = trimmedQuery.toLowerCase();
        const matches = normalizedQuery
            ? TIMEZONE_OPTIONS.filter((option) => {
                  return (
                      option.value.toLowerCase().includes(normalizedQuery) ||
                      option.label.toLowerCase().includes(normalizedQuery) ||
                      option.group.toLowerCase().includes(normalizedQuery)
                  );
              })
            : TIMEZONE_OPTIONS;

        return matches.slice(0, 80);
    }, [trimmedQuery]);

    const groupedOptions = React.useMemo(() => {
        return filteredOptions.reduce<Record<string, TimezoneOption[]>>((groups, option) => {
            groups[option.group] ??= [];
            groups[option.group].push(option);
            return groups;
        }, {});
    }, [filteredOptions]);

    const exactMatch = TIMEZONE_OPTIONS.find((option) => option.value.toLowerCase() === trimmedQuery.toLowerCase());
    const canUseCustom = trimmedQuery.length > 0 && isValidTimezone(trimmedQuery) && !exactMatch;

    const selectTimezone = (timezone: string) => {
        onChange(timezone);
        setQuery('');
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    render={<div />}
                    nativeButton={false}
                    className={cn(
                        'h-8 w-full justify-between font-normal',
                        !valueIsValid && 'border-destructive text-destructive',
                    )}
                >
                    <span className="truncate">{selectedLabel}</span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                const nextTimezone = canUseCustom
                                    ? trimmedQuery
                                    : (exactMatch?.value ?? filteredOptions[0]?.value);
                                if (nextTimezone) {
                                    event.preventDefault();
                                    selectTimezone(nextTimezone);
                                }
                            }
                        }}
                        placeholder="Search or type an IANA timezone..."
                        className="h-8 pl-8"
                        autoFocus
                    />
                </div>

                <div className="max-h-72 overflow-y-auto pr-1">
                    {canUseCustom && (
                        <button
                            type="button"
                            onClick={() => selectTimezone(trimmedQuery)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        >
                            <span className="truncate">Use {timezoneLabel(trimmedQuery)}</span>
                            <Check className="size-4 text-muted-foreground" />
                        </button>
                    )}

                    {Object.entries(groupedOptions).map(([group, options]) => (
                        <div key={group} className="py-1">
                            <p className="px-2 py-1 text-xs text-muted-foreground">{group}</p>
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => selectTimezone(option.value)}
                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                                >
                                    <Check
                                        className={cn(
                                            'size-4 shrink-0',
                                            option.value === value ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}

                    {filteredOptions.length === 0 && !canUseCustom && (
                        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No matching IANA timezone.
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
