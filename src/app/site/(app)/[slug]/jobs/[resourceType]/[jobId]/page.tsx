'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
    DataTable,
    DataTableBody,
    DataTableChevronHead,
    DataTableDetail,
    DataTableHeader,
    DataTableRow,
} from '@/components/ui/data-table';
import { RelativeTime } from '@/components/ui/relative-time';
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

type Execution = ReturnType<typeof usePaginatedQuery<typeof api.jobs.templateJobs.listExecutions>>['results'][number];

function ExecutionDetailPanel({ execution }: { execution: Execution }) {
    return (
        <div className="px-4 py-3">
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Execution ID</dt>
                <dd className="min-w-0 font-mono text-foreground select-text break-all">{execution._id}</dd>

                {execution.workerJobId && execution.workerJobId !== execution._id && (
                    <>
                        <dt className="text-muted-foreground">Worker Job ID</dt>
                        <dd className="min-w-0 font-mono text-foreground select-text break-all">
                            {execution.workerJobId}
                        </dd>
                    </>
                )}

                <dt className="text-muted-foreground">Source</dt>
                <dd className="min-w-0 text-foreground select-text">{execution.source}</dd>

                <dt className="text-muted-foreground">Work Key</dt>
                <dd className="min-w-0 font-mono text-foreground select-text break-all">{execution.workKey}</dd>

                {execution.retryOfJobId && (
                    <>
                        <dt className="text-muted-foreground">Retry of</dt>
                        <dd className="min-w-0 font-mono text-foreground select-text break-all">
                            {execution.retryOfJobId}
                        </dd>
                    </>
                )}

                <dt className="text-muted-foreground">Created</dt>
                <dd className="min-w-0 text-foreground select-text">
                    {new Date(execution.createdAt).toLocaleString()}
                </dd>

                {execution.startedAt && (
                    <>
                        <dt className="text-muted-foreground">Started</dt>
                        <dd className="min-w-0 text-foreground select-text">
                            {new Date(execution.startedAt).toLocaleString()}
                        </dd>
                    </>
                )}

                {execution.finishedAt && (
                    <>
                        <dt className="text-muted-foreground">Finished</dt>
                        <dd className="min-w-0 text-foreground select-text">
                            {new Date(execution.finishedAt).toLocaleString()}
                        </dd>
                    </>
                )}

                {execution.errorMessage && (
                    <>
                        <dt className="text-muted-foreground">Error</dt>
                        <dd className="min-w-0 text-destructive select-text wrap-break-word">
                            {execution.errorMessage}
                        </dd>
                    </>
                )}

                {execution.payload !== undefined && execution.payload !== null && (
                    <>
                        <dt className="text-muted-foreground">Payload</dt>
                        <dd className="min-w-0">
                            <pre className="whitespace-pre-wrap break-all rounded bg-muted px-2 py-1.5 font-mono text-xs text-foreground select-text">
                                {JSON.stringify(execution.payload, null, 2)}
                            </pre>
                        </dd>
                    </>
                )}
            </dl>
        </div>
    );
}

type Job = NonNullable<ReturnType<typeof useQuery<typeof api.jobs.templateJobs.getById>>>;

function JobSummaryCard({ job }: { job: Job }) {
    return (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="min-w-0">
                    <StatusIndicator status={job.status} />
                </dd>

                <dt className="text-muted-foreground">Resource</dt>
                <dd className="min-w-0 text-foreground select-text">
                    {job.resourceName ?? job.resourceType}
                    <span className="ml-1.5 font-mono text-muted-foreground/60" title={job.resourceId}>
                        {job.resourceId.slice(0, 8)}…
                    </span>
                </dd>

                <dt className="text-muted-foreground">Attempts</dt>
                <dd className="min-w-0 text-foreground">{job.executionCount}</dd>

                <dt className="text-muted-foreground">Source</dt>
                <dd className="min-w-0 text-foreground select-text">{job.source}</dd>

                <dt className="text-muted-foreground">Work Key</dt>
                <dd className="min-w-0 font-mono text-foreground select-text break-all">{job.workKey}</dd>

                {job.currentExecutionId && (
                    <>
                        <dt className="text-muted-foreground">Current Run</dt>
                        <dd className="min-w-0 font-mono text-foreground select-text break-all">
                            {job.currentExecutionId}
                        </dd>
                    </>
                )}

                <dt className="text-muted-foreground">Created</dt>
                <dd className="min-w-0 text-foreground select-text">{new Date(job.createdAt).toLocaleString()}</dd>

                {job.startedAt && (
                    <>
                        <dt className="text-muted-foreground">Started</dt>
                        <dd className="min-w-0 text-foreground select-text">
                            {new Date(job.startedAt).toLocaleString()}
                        </dd>
                    </>
                )}

                {job.finishedAt && (
                    <>
                        <dt className="text-muted-foreground">Finished</dt>
                        <dd className="min-w-0 text-foreground select-text">
                            {new Date(job.finishedAt).toLocaleString()}
                        </dd>
                    </>
                )}

                {job.errorMessage && (
                    <>
                        <dt className="text-muted-foreground">Error</dt>
                        <dd className="min-w-0 text-destructive select-text wrap-break-word">{job.errorMessage}</dd>
                    </>
                )}
            </dl>
        </div>
    );
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
                : api.jobs.pluginDataJobs.getById;

    const executionsQuery =
        resourceType === 'template'
            ? api.jobs.templateJobs.listExecutions
            : resourceType === 'frame'
              ? api.jobs.frameJobs.listExecutions
              : resourceType === 'device'
                ? api.jobs.deviceJobs.listExecutions
                : api.jobs.pluginDataJobs.listExecutions;

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
        <div className="flex flex-col min-h-full gap-6 p-6">
            <div>
                <Link href={`/site/${params.slug}/jobs`} className="text-sm text-muted-foreground underline">
                    Back to jobs
                </Link>
                <h1 className="mt-2 text-xl font-semibold tracking-tight">Job history</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                    <span className="font-medium">{job.resourceName ?? job.resourceType}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {job.type}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground/40" title={job.resourceId}>
                        {job.resourceId.slice(0, 8)}…
                    </span>
                </p>
            </div>

            <JobSummaryCard job={job} />

            <DataTable
                rows={results}
                getRowKey={(r) => r._id}
                paginationStatus={status}
                onLoadMore={() => loadMore(25)}
                emptyTitle="No executions yet"
                emptyDescription="Execution history will appear here once the job runs."
            >
                <DataTableHeader>
                    <TableRow>
                        <DataTableChevronHead />
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-36">Attempt</TableHead>
                        <TableHead className="w-[21rem]">Source</TableHead>
                        <TableHead className="w-24">Created</TableHead>
                        <TableHead className="w-20">Duration</TableHead>
                        <TableHead>Error</TableHead>
                    </TableRow>
                </DataTableHeader>
                <DataTableBody>
                    <DataTableRow>
                        {(execution: Execution) => (
                            <>
                                <TableCell className="w-24">
                                    <StatusIndicator status={execution.status} />
                                </TableCell>
                                <TableCell className="w-36 font-mono text-xs text-muted-foreground">
                                    #{execution.executionNumber ?? execution.attempts}
                                </TableCell>
                                <TableCell className="w-[21rem] text-xs text-muted-foreground">
                                    {execution.source}
                                </TableCell>
                                <TableCell className="w-24">
                                    <RelativeTime timestamp={execution.createdAt} />
                                </TableCell>
                                <TableCell className="w-20">
                                    <JobDuration startedAt={execution.startedAt} finishedAt={execution.finishedAt} />
                                </TableCell>
                                <TableCell>
                                    {execution.errorMessage ? (
                                        <span className="text-xs text-destructive">{execution.errorMessage}</span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                            </>
                        )}
                    </DataTableRow>
                    <DataTableDetail>
                        {(execution: Execution) => <ExecutionDetailPanel execution={execution} />}
                    </DataTableDetail>
                </DataTableBody>
            </DataTable>
        </div>
    );
}
