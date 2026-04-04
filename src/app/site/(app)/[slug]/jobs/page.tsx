'use client';

import * as React from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@convex/api';
import { useSite } from '@/providers/site-provider';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function JobsPage() {
    const { site, permissions } = useSite();
    const { results, status, loadMore } = usePaginatedQuery(
        api.jobs.listBySite,
        { siteId: site._id },
        { initialNumItems: 25 },
    );
    const [jobActionId, setJobActionId] = React.useState<string | null>(null);

    const handleJobAction = async (jobId: string, action: 'cancel' | 'pause' | 'resume' | 'retry') => {
        setJobActionId(jobId);
        try {
            const response = await fetch(`/api/v2/jobs/${jobId}/${action}`, { method: 'POST' });
            if (response.ok) {
                toast.success(
                    action === 'cancel'
                        ? 'Job cancelled'
                        : action === 'pause'
                          ? 'Job paused'
                          : action === 'resume'
                            ? 'Job resumed'
                            : 'Job retried',
                );
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

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
                <p className="text-muted-foreground">Recent background work for {site.name}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {results.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {status === 'LoadingFirstPage' ? 'Loading…' : 'No jobs yet'}
                        </p>
                    ) : (
                        results.map((job) => (
                            <Card key={job._id} size="sm" className="gap-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline">{job.type}</Badge>
                                        <Badge
                                            variant={
                                                job.status === 'failed'
                                                    ? 'destructive'
                                                    : job.status === 'succeeded'
                                                      ? 'secondary'
                                                      : job.status === 'paused'
                                                        ? 'outline'
                                                        : 'outline'
                                            }
                                        >
                                            {job.status}
                                        </Badge>
                                        <Badge variant="secondary">{job.source}</Badge>
                                    </CardTitle>
                                    {permissions.site.manage ? (
                                        <CardAction className="flex gap-2">
                                            {job.status === 'pending' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={jobActionId === job._id}
                                                    onClick={() => void handleJobAction(job._id, 'pause')}
                                                >
                                                    Pause
                                                </Button>
                                            ) : null}
                                            {job.status === 'pending' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={jobActionId === job._id}
                                                    onClick={() => void handleJobAction(job._id, 'cancel')}
                                                >
                                                    Cancel
                                                </Button>
                                            ) : null}
                                            {job.status === 'paused' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={jobActionId === job._id}
                                                    onClick={() => void handleJobAction(job._id, 'resume')}
                                                >
                                                    Resume
                                                </Button>
                                            ) : null}
                                            {job.status === 'failed' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={jobActionId === job._id}
                                                    onClick={() => void handleJobAction(job._id, 'retry')}
                                                >
                                                    Retry
                                                </Button>
                                            ) : null}
                                        </CardAction>
                                    ) : null}
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <div>
                                        Resource: {job.resourceType} {job.resourceId}
                                    </div>
                                    <div>Created: {new Date(job.createdAt).toLocaleString()}</div>
                                    {job.startedAt ? (
                                        <div>Started: {new Date(job.startedAt).toLocaleString()}</div>
                                    ) : null}
                                    {job.finishedAt ? (
                                        <div>Finished: {new Date(job.finishedAt).toLocaleString()}</div>
                                    ) : null}
                                    {job.status !== 'cancelled' && job.errorMessage ? (
                                        <div className="text-destructive">Error: {job.errorMessage}</div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        ))
                    )}

                    {status === 'CanLoadMore' ? (
                        <div className="flex justify-center">
                            <Button variant="outline" onClick={() => loadMore(25)}>
                                Load more
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
