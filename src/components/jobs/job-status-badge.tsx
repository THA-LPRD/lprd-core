'use client';

import { Badge } from '@/components/ui/badge';

type LatestJob = {
    status: 'pending' | 'running' | 'succeeded' | 'failed';
    errorMessage?: string;
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

    return <Badge variant="outline">Pending</Badge>;
}
