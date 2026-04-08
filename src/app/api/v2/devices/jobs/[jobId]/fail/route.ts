import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
    try {
        const authorization = await requirePermission(permissionCatalog.org.site.device.manage.job.write, { request });
        const { jobId } = await context.params;
        const body = (await request.json()) as { errorMessage: string };
        if (!body.errorMessage) {
            return NextResponse.json({ error: 'errorMessage is required' }, { status: 400 });
        }
        await fetchMutation(
            api.jobs.deviceJobs.fail,
            { id: jobId as Id<'jobs'>, errorMessage: body.errorMessage },
            { token: authorization.accessToken },
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
