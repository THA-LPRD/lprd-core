'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const ALL_STATUSES = ['active', 'suspended', 'removed'] as const;
type ApplicationStatus = (typeof ALL_STATUSES)[number];
const DEFAULT_STATUSES: ApplicationStatus[] = ['active', 'suspended'];

function parseStatusParams(params: URLSearchParams): Set<ApplicationStatus> {
    const raw = params.get('status');
    if (!raw) return new Set(DEFAULT_STATUSES);
    const values = raw.split(',').filter((v): v is ApplicationStatus => ALL_STATUSES.includes(v as ApplicationStatus));
    return values.length > 0 ? new Set(values) : new Set(DEFAULT_STATUSES);
}

export function useApplicationFilters<T extends { name: string; description?: string; status: string }>(
    applications: T[] | undefined,
) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const search = searchParams.get('q') ?? '';
    const [debouncedSearch, setDebouncedSearch] = React.useState(search);
    const statusFilters = React.useMemo(() => parseStatusParams(searchParams), [searchParams]);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 250);
        return () => clearTimeout(timer);
    }, [search]);

    const updateParams = React.useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(updates)) {
                if (value === null) params.delete(key);
                else params.set(key, value);
            }
            const qs = params.toString();
            router.replace(qs ? `?${qs}` : '/admin/applications', { scroll: false });
        },
        [router, searchParams],
    );

    const setSearch = React.useCallback((value: string) => updateParams({ q: value || null }), [updateParams]);

    const setStatusFilters = React.useCallback(
        (next: Set<ApplicationStatus>) => {
            const isDefault = next.size === DEFAULT_STATUSES.length && DEFAULT_STATUSES.every((s) => next.has(s));
            updateParams({ status: isDefault ? null : [...next].join(',') });
        },
        [updateParams],
    );

    const toggleStatus = React.useCallback(
        (status: ApplicationStatus) => {
            const next = new Set(statusFilters);
            if (next.has(status)) next.delete(status);
            else next.add(status);
            setStatusFilters(next);
        },
        [statusFilters, setStatusFilters],
    );

    const selectAll = React.useCallback(() => setStatusFilters(new Set(ALL_STATUSES)), [setStatusFilters]);

    const filteredApplications = React.useMemo(() => {
        if (!applications) return [];
        return applications.filter((application) => {
            const matchesSearch =
                debouncedSearch === '' ||
                application.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (application.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false);
            const matchesStatus =
                statusFilters.size === 0 || statusFilters.has(application.status as ApplicationStatus);
            return matchesSearch && matchesStatus;
        });
    }, [applications, debouncedSearch, statusFilters]);

    return { search, statusFilters, filteredApplications, setSearch, toggleStatus, selectAll };
}

export function ApplicationListFilter({
    search,
    statusFilters,
    onSearchChange,
    onToggleStatus,
    onSelectAll,
}: {
    search: string;
    statusFilters: Set<ApplicationStatus>;
    onSearchChange: (value: string) => void;
    onToggleStatus: (status: ApplicationStatus) => void;
    onSelectAll: () => void;
}) {
    const allSelected = statusFilters.size === ALL_STATUSES.length;

    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    placeholder="Search service accounts..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>
            <Popover>
                <PopoverTrigger>
                    <Button variant="outline" size="sm" render={<div />} nativeButton={false}>
                        <Filter className="size-4 mr-2" />
                        Status
                        {!allSelected && (
                            <span className="ml-1 text-xs text-muted-foreground">({statusFilters.size})</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-44">
                    <div className="flex flex-col gap-2">
                        {ALL_STATUSES.map((status) => (
                            <label key={status} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                                <Checkbox
                                    checked={statusFilters.has(status)}
                                    onCheckedChange={() => onToggleStatus(status)}
                                />
                                {status}
                            </label>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 w-full justify-start"
                            onClick={onSelectAll}
                            disabled={allSelected}
                        >
                            Select all
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
