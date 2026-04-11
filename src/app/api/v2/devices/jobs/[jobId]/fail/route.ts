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
        const job = await fetchQuery(api.jobs.deviceJobs.getById, { id: jobId as Id<'jobStates'> }, { token });
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        await requirePermission(permissionCatalog.org.site.device.manage.job.write, { request, siteId: job.siteId });
        const body = (await request.json()) as { errorMessage: string };
        if (!body.errorMessage) {
            return NextResponse.json({ error: 'errorMessage is required' }, { status: 400 });
        }
        await fetchMutation(
            api.jobs.deviceJobs.fail,
            { id: jobId as Id<'jobStates'>, errorMessage: body.errorMessage },
            { token },
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Device job fail error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
