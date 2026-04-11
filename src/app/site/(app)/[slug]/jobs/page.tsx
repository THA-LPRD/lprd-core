'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@convex/api';
import { useSite } from '@/providers/site-provider';
import { toast } from 'sonner';
import { Ban, ChevronDown, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const resourceTypes = [
    { value: 'template', label: 'Templates' },
    { value: 'frame', label: 'Frames' },
    { value: 'device', label: 'Devices' },
    { value: 'pluginData', label: 'Plugin Data' },
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

function RelativeTime({ timestamp }: { timestamp: number }) {
    const [now] = React.useState(() => Date.now());
    const diff = now - timestamp;
    let label: string;
    if (diff < 60_000) label = 'just now';
    else if (diff < 3_600_000) label = `${Math.floor(diff / 60_000)}m ago`;
    else if (diff < 86_400_000) label = `${Math.floor(diff / 3_600_000)}h ago`;
    else label = `${Math.floor(diff / 86_400_000)}d ago`;

    return (
        <span
            title={new Date(timestamp).toLocaleString()}
            className="cursor-default text-xs text-muted-foreground tabular-nums"
        >
            {label}
        </span>
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
        <div className="overflow-hidden border-t bg-muted/30 px-4 py-3">
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
                {job.status !== 'cancelled' && job.errorMessage && (
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
    const jobsQuery =
        resourceType === 'template'
            ? api.jobs.templateJobs.listBySite
            : resourceType === 'frame'
              ? api.jobs.frameJobs.listBySite
              : resourceType === 'device'
                ? api.jobs.deviceJobs.listBySite
                : api.jobs.pluginDataJobs.listBySite;
    const { results, status, loadMore } = usePaginatedQuery(
        jobsQuery as typeof api.jobs.templateJobs.listBySite,
        { siteId: site._id },
        { initialNumItems: 25 },
    );
    const [jobActionId, setJobActionId] = React.useState<string | null>(null);
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const resourceJobBasePath: Record<ResourceType, string> = {
        template: '/api/v2/templates/jobs',
        frame: '/api/v2/frames/jobs',
        device: '/api/v2/devices/jobs',
        pluginData: '/api/v2/plugin-data/jobs',
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
        pluginData: permissions.org.site.pluginData.job.write,
    };

    const toggleExpanded = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Background work for {site.name}</p>
            </div>

            <div className="flex flex-col gap-3">
                <div className="inline-flex self-start rounded-lg border bg-muted/40 p-1 gap-px">
                    {resourceTypes.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setResourceType(option.value)}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
                                resourceType === option.value
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-lg border">
                    <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
                        {results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                {status === 'LoadingFirstPage' ? (
                                    <p className="text-sm text-muted-foreground">Loading…</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium">No jobs yet</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Jobs will appear here when background work is triggered.
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-2 text-[0.8125rem] font-medium text-muted-foreground">
                                    <span className="w-3.5 shrink-0" />
                                    <span className="w-24 shrink-0">Status</span>
                                    <span className="w-40 shrink-0">Type</span>
                                    <span className="w-72 shrink-0">Resource</span>
                                    <span className="w-18 shrink-0">Created</span>
                                    <span className="w-20 shrink-0">Duration</span>
                                    <span className="min-w-0 flex-1">Error</span>
                                    {canManageJobs[resourceType] && (
                                        <span className="w-16 shrink-0 text-right">Actions</span>
                                    )}
                                </div>
                                <div className="divide-y">
                                    {results.map((job) => {
                                        const isExpanded = expandedId === job._id;
                                        return (
                                            <div key={job._id}>
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => toggleExpanded(job._id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            toggleExpanded(job._id);
                                                        }
                                                    }}
                                                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                                                >
                                                    <span className="shrink-0 text-muted-foreground/50">
                                                        {isExpanded ? (
                                                            <ChevronDown className="size-3.5" />
                                                        ) : (
                                                            <ChevronRight className="size-3.5" />
                                                        )}
                                                    </span>
                                                    <div className="w-24 shrink-0">
                                                        <StatusIndicator status={job.status} />
                                                    </div>
                                                    <div className="w-40 shrink-0">
                                                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                                            {job.type}
                                                        </span>
                                                    </div>
                                                    <div className="w-72 shrink-0 min-w-0">
                                                        <div className="text-xs font-medium">{job.resourceType}</div>
                                                        <div className="truncate font-mono text-xs text-muted-foreground">
                                                            {job.resourceId}
                                                        </div>
                                                    </div>
                                                    <div className="w-18 shrink-0">
                                                        <RelativeTime timestamp={job.createdAt} />
                                                    </div>
                                                    <div className="w-20 shrink-0">
                                                        <JobDuration
                                                            startedAt={job.startedAt}
                                                            finishedAt={job.finishedAt}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1 truncate">
                                                        {job.status !== 'cancelled' && job.errorMessage ? (
                                                            <span className="text-xs text-destructive">
                                                                {job.errorMessage}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </div>
                                                    {canManageJobs[resourceType] && (
                                                        <div
                                                            className="flex w-16 shrink-0 items-center justify-end gap-0.5"
                                                            onClick={stopPropagation}
                                                        >
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
                                                    )}
                                                </div>
                                                {isExpanded && (
                                                    <JobDetailPanel
                                                        job={job}
                                                        resourceType={resourceType}
                                                        siteSlug={site.slug}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
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
            </div>
        </div>
    );
}
