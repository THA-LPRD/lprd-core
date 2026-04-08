'use client';

import { Badge } from '@/components/ui/badge';

type LatestJob = {
    status: 'pending' | 'paused' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    errorMessage?: string;
    jobId?: string;
    updatedAt: number;
};

export function JobStatusBadge({ latestJob }: { latestJob?: LatestJob }) {
    if (!latestJob) return null;

    if (latestJob.status === 'succeeded') {
        return <Badge variant="secondary">Ready</Badge>;
    }

    if (latestJob.status === 'failed') {
        return <Badge variant="destructive">Failed</Badge>;
    }

    if (latestJob.status === 'running') {
        return <Badge variant="outline">Running</Badge>;
    }

    if (latestJob.status === 'paused') {
        return <Badge variant="outline">Paused</Badge>;
    }

    if (latestJob.status === 'cancelled') {
        return <Badge variant="secondary">Cancelled</Badge>;
    }

    return <Badge variant="outline">Pending</Badge>;
}
