import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization, requirePermission } from '@/lib/authz';
import { appJobsQueue } from '@/lib/jobs/dispatch';
import type { WorkerJobPayload } from '@/lib/jobs/types';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const { jobId } = await context.params;
        const token = authorization.accessToken;

        const job = await fetchQuery(api.jobs.frameJobs.getById, { id: jobId as Id<'jobStates'> }, { token });
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        await requirePermission(permissionCatalog.org.site.frame.manage.job.write, { request, siteId: job.siteId });

        const queuedJob = await fetchMutation(api.jobs.frameJobs.resume, { id: job._id }, { token });

        await appJobsQueue.add(
            queuedJob.type,
            {
                type: queuedJob.type as WorkerJobPayload['type'],
                jobStateId: queuedJob.jobStateId,
                executionId: queuedJob.executionId,
                payload: queuedJob.payload,
            } as WorkerJobPayload,
            { jobId: queuedJob.workerJobId, removeOnComplete: true, removeOnFail: false },
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Frame job resume error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
