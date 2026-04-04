import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { AuthError } from '@/lib/application/auth';
import { requireManagedSite } from '@/lib/api-auth';
import { recordAndEnqueueJob } from '@/lib/worker-jobs';
import type { JobResourceType, JobSource, JobType, WorkerJobPayload } from '@/lib/jobs';
import { appJobsQueue } from '@worker/queue';

async function getAuthToken() {
    const auth = await withAuth();
    if (!auth.user || !auth.accessToken) {
        throw new AuthError('Unauthorized', 401);
    }
    return auth.accessToken;
}

export async function getManagedJob(jobId: string) {
    const token = await getAuthToken();

    const job = await fetchQuery(api.jobs.getByIdForRoute, { id: jobId as Id<'jobs'> }, { token });
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!job.siteId) {
        return NextResponse.json({ error: 'This job cannot be managed from the site UI' }, { status: 400 });
    }

    await requireManagedSite(job.siteId);
    return { job, token };
}

export function handleJobActionError(error: unknown) {
    if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('Job action error:', error);
    return NextResponse.json(
        { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
        { status: 500 },
    );
}

export async function cancelJob(jobId: string) {
    const result = await getManagedJob(jobId);
    if (result instanceof Response) return result;

    await fetchMutation(api.jobs.cancel, { id: result.job._id }, { token: result.token });

    const queueJob = await appJobsQueue.getJob(result.job.dedupeKey);
    if (queueJob) await queueJob.remove();

    return NextResponse.json({ ok: true });
}

export async function pauseJob(jobId: string) {
    const result = await getManagedJob(jobId);
    if (result instanceof Response) return result;

    await fetchMutation(api.jobs.pause, { id: result.job._id }, { token: result.token });

    const queueJob = await appJobsQueue.getJob(result.job.dedupeKey);
    if (queueJob) await queueJob.remove();

    return NextResponse.json({ ok: true });
}

export async function resumeJob(jobId: string) {
    const result = await getManagedJob(jobId);
    if (result instanceof Response) return result;

    await fetchMutation(api.jobs.resume, { id: result.job._id }, { token: result.token });

    await appJobsQueue.add(
        result.job.type,
        {
            type: result.job.type as WorkerJobPayload['type'],
            jobId: result.job._id,
            payload: result.job.payload,
        } as WorkerJobPayload,
        {
            jobId: result.job.dedupeKey,
            removeOnComplete: true,
            removeOnFail: false,
        },
    );

    return NextResponse.json({ ok: true });
}

export async function retryJob(jobId: string) {
    const result = await getManagedJob(jobId);
    if (result instanceof Response) return result;
    if (result.job.status !== 'failed') {
        return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 409 });
    }

    await recordAndEnqueueJob({
        token: result.token,
        actorId: result.job.actorId,
        siteId: result.job.siteId ?? undefined,
        type: result.job.type as JobType,
        resourceType: result.job.resourceType as JobResourceType,
        resourceId: result.job.resourceId,
        source: result.job.source as JobSource,
        payload: { type: result.job.type as WorkerJobPayload['type'], payload: result.job.payload } as WorkerJobPayload,
        dedupeKey: `${result.job.dedupeKey}__retry__${Date.now()}`,
    });

    return NextResponse.json({ ok: true });
}
