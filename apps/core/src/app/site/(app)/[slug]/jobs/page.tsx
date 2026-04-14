'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@convex/api';
import { useSite } from '@/providers/site-provider';
import { toast } from 'sonner';
import { Ban, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { TableCell, TableHead, TableRow } from '@workspace/ui/components/table';
import {
    DataTable,
    DataTableBody,
    DataTableChevronHead,
    DataTableDetail,
    DataTableHeader,
    DataTableRow,
} from '@workspace/ui/components/data-table';
import { RelativeTime } from '@workspace/ui/components/relative-time';
import { cn } from '@/lib/utils';

const resourceTypes = [
    { value: 'template', label: 'Templates' },
    { value: 'frame', label: 'Frames' },
    { value: 'device', label: 'Devices' },
] as const;

type ResourceType = (typeof resourceTypes)[number]['value'];

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

function IconAction({
    icon: Icon,
    label,
    onClick,
    disabled,
    destructive,
}: {
    icon: React.ElementType;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    disabled: boolean;
    destructive?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'size-7 text-muted-foreground hover:text-foreground',
                            destructive && 'hover:text-destructive',
                        )}
                        disabled={disabled}
                        onClick={onClick}
                    />
                }
            >
                <Icon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

type Job = ReturnType<typeof usePaginatedQuery<typeof api.jobs.templateJobs.listBySite>>['results'][number];

function JobDetailPanel({ job, resourceType, siteSlug }: { job: Job; resourceType: ResourceType; siteSlug: string }) {
    return (
        <div className="px-4 py-3">
            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Resource ID</dt>
                <dd className="min-w-0 font-mono text-foreground select-text break-all">{job.resourceId}</dd>

                <dt className="text-muted-foreground">Source</dt>
                <dd className="min-w-0 text-foreground select-text">{job.source}</dd>

                <dt className="text-muted-foreground">Attempts</dt>
                <dd className="min-w-0 text-foreground select-text">{job.executionCount}</dd>

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

                <dt className="text-muted-foreground">History</dt>
                <dd className="min-w-0">
                    <Link
                        href={`/site/${siteSlug}/jobs/${resourceType}/${job._id}`}
                        className="text-foreground underline underline-offset-4"
                    >
                        View execution history
                    </Link>
                </dd>
            </dl>
        </div>
    );
}

export default function JobsPage() {
    const { site, permissions } = useSite();
    const [resourceType, setResourceType] = React.useState<ResourceType>('template');
    const [jobActionId, setJobActionId] = React.useState<string | null>(null);

    const jobsQuery =
        resourceType === 'template'
            ? api.jobs.templateJobs.listBySite
            : resourceType === 'frame'
              ? api.jobs.frameJobs.listBySite
              : api.jobs.deviceJobs.listBySite;

    const { results, status, loadMore } = usePaginatedQuery(
        jobsQuery as typeof api.jobs.templateJobs.listBySite,
        { siteId: site._id },
        { initialNumItems: 25 },
    );

    const resourceJobBasePath: Record<ResourceType, string> = {
        template: '/api/v2/templates/jobs',
        frame: '/api/v2/frames/jobs',
        device: '/api/v2/devices/jobs',
    };

    const handleJobAction = async (jobId: string, action: 'cancel' | 'pause' | 'resume' | 'retry') => {
        setJobActionId(jobId);
        try {
            const response = await fetch(`${resourceJobBasePath[resourceType]}/${jobId}/${action}`, { method: 'POST' });
            if (response.ok) {
                const labels = {
                    cancel: 'Job cancelled',
                    pause: 'Job paused',
                    resume: 'Job resumed',
                    retry: 'Job retried',
                };
                toast.success(labels[action]);
            } else {
                const data = (await response.json()) as { error?: string };
                toast.error(data.error ?? 'Job action failed');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Job action failed');
        } finally {
            setJobActionId(null);
        }
    };

    const canManageJobs: Record<ResourceType, boolean> = {
        template: permissions.org.site.template.job.write,
        frame: permissions.org.site.frame.job.write,
        device: permissions.org.site.device.job.write,
    };

    const canManage = canManageJobs[resourceType];

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Background work for {site.name}</p>
            </div>

            <div className="flex flex-col min-h-full gap-3">
                <Tabs value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
                    <TabsList>
                        {resourceTypes.map((option) => (
                            <TabsTrigger key={option.value} value={option.value}>
                                {option.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <DataTable
                    key={resourceType}
                    rows={results}
                    getRowKey={(r) => r._id}
                    paginationStatus={status}
                    onLoadMore={() => loadMore(25)}
                    emptyTitle="No jobs yet"
                    emptyDescription="Jobs will appear here when background work is triggered."
                >
                    <DataTableHeader>
                        <TableRow>
                            <DataTableChevronHead />
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-36">Type</TableHead>
                            <TableHead className="w-56">Resource</TableHead>
                            <TableHead className="w-28">Source</TableHead>
                            <TableHead className="w-24">Created</TableHead>
                            <TableHead className="w-20">Duration</TableHead>
                            <TableHead>Error</TableHead>
                            {canManage && <TableHead className="w-16 text-right">Actions</TableHead>}
                        </TableRow>
                    </DataTableHeader>
                    <DataTableBody>
                        <DataTableRow>
                            {(job: Job) => (
                                <>
                                    <TableCell className="w-24">
                                        <StatusIndicator status={job.status} />
                                    </TableCell>
                                    <TableCell className="w-36">
                                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                            {job.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="w-56 min-w-0">
                                        {job.resourceName ? (
                                            <>
                                                <div className="truncate text-xs font-medium">{job.resourceName}</div>
                                                <div className="truncate font-mono text-xs text-muted-foreground/60">
                                                    {job.resourceId.slice(0, 8)}…
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-xs text-muted-foreground">{job.resourceType}</div>
                                                <div className="truncate font-mono text-xs text-muted-foreground/60">
                                                    {job.resourceId.slice(0, 8)}…
                                                </div>
                                            </>
                                        )}
                                    </TableCell>
                                    <TableCell className="w-28 text-xs text-muted-foreground">{job.source}</TableCell>
                                    <TableCell className="w-24">
                                        <RelativeTime timestamp={job.createdAt} />
                                    </TableCell>
                                    <TableCell className="w-20">
                                        <JobDuration startedAt={job.startedAt} finishedAt={job.finishedAt} />
                                    </TableCell>
                                    <TableCell>
                                        {job.status !== 'cancelled' && job.errorMessage ? (
                                            <span className="text-xs text-destructive">{job.errorMessage}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell className="w-16" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-0.5">
                                                {job.status === 'pending' && (
                                                    <>
                                                        <IconAction
                                                            icon={Pause}
                                                            label="Pause"
                                                            disabled={jobActionId === job._id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleJobAction(job._id, 'pause');
                                                            }}
                                                        />
                                                        <IconAction
                                                            icon={Ban}
                                                            label="Cancel"
                                                            disabled={jobActionId === job._id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleJobAction(job._id, 'cancel');
                                                            }}
                                                            destructive
                                                        />
                                                    </>
                                                )}
                                                {job.status === 'paused' && (
                                                    <IconAction
                                                        icon={Play}
                                                        label="Resume"
                                                        disabled={jobActionId === job._id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void handleJobAction(job._id, 'resume');
                                                        }}
                                                    />
                                                )}
                                                {job.status === 'failed' && (
                                                    <IconAction
                                                        icon={RotateCcw}
                                                        label="Retry"
                                                        disabled={jobActionId === job._id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void handleJobAction(job._id, 'retry');
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </>
                            )}
                        </DataTableRow>
                        <DataTableDetail>
                            {(job: Job) => (
                                <JobDetailPanel job={job} resourceType={resourceType} siteSlug={site.slug} />
                            )}
                        </DataTableDetail>
                    </DataTableBody>
                </DataTable>
            </div>
        </div>
    );
}
