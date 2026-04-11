import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization, requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const { jobId } = await context.params;
        const token = authorization.accessToken;

        const job = await fetchQuery(api.jobs.templateJobs.getById, { id: jobId as Id<'jobStates'> }, { token });
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

        if (job.siteId) {
            await requirePermission(permissionCatalog.org.site.template.manage.job.write, {
                request,
                siteId: job.siteId,
            });
        } else if (!authorization.can(permissionCatalog.org.template.manage.upsert.job.write)) {
            throw new AuthError('Forbidden', 403);
        }

        await fetchMutation(api.jobs.templateJobs.start, { id: job._id }, { token });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Template job start error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
