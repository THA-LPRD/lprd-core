import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization } from '@/lib/authz';
import { appJobsQueue } from '@/lib/jobs/dispatch';
import type { WorkerJobPayload } from '@/lib/jobs/types';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
    try {
        const authorization = await requireAuthorization();
        const { jobId } = await context.params;
        const token = authorization.accessToken;

        const job = await fetchQuery(api.jobs.templateJobs.getById, { id: jobId as Id<'jobs'> }, { token });
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

        if (job.siteId) {
            if (!authorization.can(permissionCatalog.org.site.template.manage.job.write)) {
                throw new AuthError('Forbidden', 403);
            }
        } else {
            if (!authorization.can(permissionCatalog.org.template.manage.upsert.job.write)) {
                throw new AuthError('Forbidden', 403);
            }
        }

        await fetchMutation(api.jobs.templateJobs.resume, { id: job._id }, { token });

        await appJobsQueue.add(
            job.type,
            { type: job.type as WorkerJobPayload['type'], jobId: job._id, payload: job.payload } as WorkerJobPayload,
            { jobId: job.dedupeKey, removeOnComplete: true, removeOnFail: false },
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Template job resume error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
