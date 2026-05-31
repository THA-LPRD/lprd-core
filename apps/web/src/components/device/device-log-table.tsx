'use client';

import * as React from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { ImageIcon } from 'lucide-react';
import type { DeviceLogStatus, DeviceLogType } from '@/lib/deviceLogs';
import { LOG_STATUS_LABELS, LOG_STATUS_VARIANTS, LOG_TYPE_LABELS, LOG_TYPE_VARIANTS } from '@/lib/deviceLogs';

type LogTypeFilter = DeviceLogType | 'all';
type LogStatusFilter = DeviceLogStatus | 'all';

function formatTimestamp(ts: number) {
    return new Date(ts).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function DeviceLogTable({ deviceId }: { deviceId: Id<'devices'> }) {
    const [typeFilter, setTypeFilter] = React.useState<LogTypeFilter>('all');
    const [statusFilter, setStatusFilter] = React.useState<LogStatusFilter>('all');

    const { results, status, loadMore } = usePaginatedQuery(
        api.devices.accessLogs.list,
        { deviceId },
        { initialNumItems: 25 },
    );

    const filtered = results.filter((entry) => {
        if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
        if (statusFilter !== 'all' && entry.responseStatus !== statusFilter) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as LogTypeFilter)}>
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {(Object.keys(LOG_TYPE_LABELS) as DeviceLogType[]).map((type) => (
                            <SelectItem key={type} value={type}>
                                {LOG_TYPE_LABELS[type]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LogStatusFilter)}>
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {(Object.keys(LOG_STATUS_LABELS) as DeviceLogStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                                {LOG_STATUS_LABELS[s]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-8" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    {status === 'LoadingFirstPage' ? 'Loading…' : 'No log entries found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((entry) => (
                                <TableRow key={entry._id}>
                                    <TableCell className="font-mono text-sm tabular-nums whitespace-nowrap">
                                        {formatTimestamp(entry.accessedAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={LOG_TYPE_VARIANTS[entry.type]}>
                                            {LOG_TYPE_LABELS[entry.type]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                        {entry.ipAddress ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={LOG_STATUS_VARIANTS[entry.responseStatus]}>
                                            {LOG_STATUS_LABELS[entry.responseStatus]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {entry.imageChanged && (
                                            <Badge variant="outline" className="gap-1 text-blue-500 border-blue-500/40">
                                                <ImageIcon className="size-3" />
                                                image updated
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {status === 'CanLoadMore' && (
                <div className="flex justify-center">
                    <Button variant="outline" onClick={() => loadMore(25)}>
                        Load more
                    </Button>
                </div>
            )}
        </div>
    );
}
