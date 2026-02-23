'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import type { TooltipProps } from 'recharts';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { LOG_TYPE_LABELS, LOG_TYPE_CHART_COLOR } from '@/lib/deviceLogs';

type DayStats = {
    date: string;
    total: number;
    byType: Record<string, number>;
};

function formatDate(dateStr: string) {
    return new Date(dateStr + 'T12:00:00Z').toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const stats = payload[0]?.payload as DayStats | undefined;
    if (!stats) return null;

    return (
        <div className="bg-popover border rounded-lg shadow-md p-3 text-sm min-w-[160px]">
            <p className="font-medium mb-2">{formatDate(label as string)}</p>
            <p className="text-muted-foreground mb-1">
                {stats.total} request{stats.total !== 1 ? 's' : ''}
            </p>
            {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{LOG_TYPE_LABELS[type as keyof typeof LOG_TYPE_LABELS] ?? type}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                </div>
            ))}
        </div>
    );
}

export function DeviceActivityChart({ deviceId }: { deviceId: Id<'devices'> }) {
    const stats = useQuery(api.devices.accessLogs.getDailyStats, { deviceId });

    if (stats === undefined) {
        return <div className="h-32 bg-muted animate-pulse rounded-lg" />;
    }

    if (!stats.length || stats.every((d) => d.total === 0)) {
        return <p className="text-sm text-muted-foreground text-center py-8">No activity in the last 7 days</p>;
    }

    const chartConfig = {
        total: { label: 'Requests', color: 'hsl(var(--chart-1))' },
    };

    return (
        <ChartContainer config={chartConfig} className="h-36 w-full">
            <BarChart data={stats} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) =>
                        new Date(v + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short' })
                    }
                    tick={{ fontSize: 11 }}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="total" fill={LOG_TYPE_CHART_COLOR.config_fetch} radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
        </ChartContainer>
    );
}
