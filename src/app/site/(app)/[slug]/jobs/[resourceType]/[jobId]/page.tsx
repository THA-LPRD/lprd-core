'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const resourceTypes = ['template', 'frame', 'device', 'pluginData'] as const;
type ResourceType = (typeof resourceTypes)[number];

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; pulse: boolean }> = {
    pending: { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', pulse: true },
    running: { label: 'Running', dot: 'bg-blue-400', text: 'text-blue-600 dark:text-blue-400', pulse: true },
    succeeded: {
        label: 'Succeeded',
        dot: 'bg-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
        pulse: false,
    },
    failed: { label: 'Failed', dot: 'bg-red-400', text: 'text-red-600 dark:text-red-400', pulse: false },
    paused: { label: 'Paused', dot: 'bg-zinc-400', text: 'text-zinc-500 dark:text-zinc-400', pulse: false },
    cancelled: { label: 'Cancelled', dot: 'bg-zinc-300', text: 'text-zinc-400 dark:text-zinc-500', pulse: false },
};

function StatusIndicator({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, dot: 'bg-zinc-400', text: 'text-zinc-500', pulse: false };
    return (
        <div className="flex items-center gap-2">
            <span className="relative flex size-2 shrink-0">
                {cfg.pulse && (
                    <span
                        className={cn(
                            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                            cfg.dot,
                        )}
                    />
                )}
                <span className={cn('relative inline-flex size-2 rounded-full', cfg.dot)} />
            </span>
            <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
        </div>
    );
}

function JobDuration({ startedAt, finishedAt }: { startedAt?: number | null; finishedAt?: number | null }) {
    const [now] = React.useState(() => Date.now());
    if (!startedAt) return <span className="text-xs text-muted-foreground">—</span>;
    const ms = (finishedAt ?? now) - startedAt;
    let label: string;
    if (ms < 1_000) label = `${ms}ms`;
    else if (ms < 60_000) label = `${(ms / 1_000).toFixed(1)}s`;
    else label = `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
    return <span className="font-mono text-xs text-muted-foreground">{label}</span>;
}

export default function JobHistoryPage() {
    const params = useParams<{ slug: string; resourceType: ResourceType; jobId: string }>();
    const isValidResourceType = resourceTypes.includes(params.resourceType as ResourceType);
    const resourceType = isValidResourceType ? (params.resourceType as ResourceType) : 'template';

    const jobQuery =
        resourceType === 'template'
            ? api.jobs.templateJobs.getById
            : resourceType === 'frame'
              ? api.jobs.frameJobs.getById
              : resourceType === 'device'
                ? api.jobs.deviceJobs.getById
                : resourceType === 'pluginData'
                  ? api.jobs.pluginDataJobs.getById
                  : api.jobs.templateJobs.getById;

    const executionsQuery =
        resourceType === 'template'
            ? api.jobs.templateJobs.listExecutions
            : resourceType === 'frame'
              ? api.jobs.frameJobs.listExecutions
              : resourceType === 'device'
                ? api.jobs.deviceJobs.listExecutions
                : resourceType === 'pluginData'
                  ? api.jobs.pluginDataJobs.listExecutions
                  : api.jobs.templateJobs.listExecutions;

    const job = useQuery(jobQuery as typeof api.jobs.templateJobs.getById, { id: params.jobId as Id<'jobStates'> });

    const { results, status, loadMore } = usePaginatedQuery(
        executionsQuery as typeof api.jobs.templateJobs.listExecutions,
        { jobStateId: params.jobId as Id<'jobStates'> },
        { initialNumItems: 25 },
    );

    if (!isValidResourceType) {
        return <div className="p-6 text-sm text-muted-foreground">Unknown job type.</div>;
    }

    if (job === undefined) {
        return <div className="p-6 text-sm text-muted-foreground">Loading job history…</div>;
    }

    if (!job) {
        return <div className="p-6 text-sm text-muted-foreground">Job not found.</div>;
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Link href={`/site/${params.slug}/jobs`} className="text-sm text-muted-foreground underline">
                        Back to jobs
                    </Link>
                    <h1 className="mt-2 text-xl font-semibold tracking-tight">Job history</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {job.type} for {job.resourceType} <span className="font-mono">{job.resourceId}</span>
                    </p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <StatusIndicator status={job.status} />
                        <span className="text-xs text-muted-foreground">{job.executionCount} attempts</span>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border">
                <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-2 text-[0.8125rem] font-medium text-muted-foreground">
                    <span className="w-24 shrink-0">Status</span>
                    <span className="w-16 shrink-0">Attempt</span>
                    <span className="w-40 shrink-0">Created</span>
                    <span className="w-20 shrink-0">Duration</span>
                    <span className="min-w-0 flex-1">Error</span>
                </div>
                <div className="divide-y">
                    {results.map((execution) => (
                        <div key={execution._id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-24 shrink-0">
                                <StatusIndicator status={execution.status} />
                            </div>
                            <div className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                                #{execution.executionNumber ?? execution.attempts}
                            </div>
                            <div className="w-40 shrink-0 text-xs text-muted-foreground">
                                {new Date(execution.createdAt).toLocaleString()}
                            </div>
                            <div className="w-20 shrink-0">
                                <JobDuration startedAt={execution.startedAt} finishedAt={execution.finishedAt} />
                            </div>
                            <div className="min-w-0 flex-1">
                                {execution.errorMessage ? (
                                    <span className="text-xs text-destructive">{execution.errorMessage}</span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {results.length === 0 && status !== 'LoadingFirstPage' && (
                    <div className="px-4 py-8 text-sm text-muted-foreground">No executions recorded yet.</div>
                )}
                {status === 'CanLoadMore' && (
                    <div className="flex justify-center border-t p-3">
                        <Button variant="ghost" size="sm" onClick={() => loadMore(25)}>
                            Load more
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
