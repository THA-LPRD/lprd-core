import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { authenticateApplication, AuthError, requireScope } from '@/lib/application/auth';
import type { JobResourceType, JobSource, JobType, WorkerJobPayload } from '@/lib/jobs';
import { recordAndEnqueueJob } from '@/lib/worker-jobs';

export const runtime = 'nodejs';

type EnqueueBody = {
    actorId?: Id<'actors'>;
    type: JobType;
    resourceType: JobResourceType;
    resourceId: string;
    siteId?: Id<'sites'>;
    source: JobSource;
    payload: WorkerJobPayload;
    dedupeKey?: string;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as EnqueueBody;
        if (!body?.type || !body?.resourceType || !body?.resourceId || !body?.source || !body?.payload) {
            return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
        }

        let actorId: Id<'actors'> | null = null;
        let token: string;
        const authHeader = request.headers.get('authorization');

        if (authHeader?.startsWith('Bearer ')) {
            const application = await authenticateApplication(request, 'internal');
            requireScope(application, 'internal_render');
            actorId = body.actorId ?? application.actorId;
            token = authHeader.slice(7);
        } else {
            const auth = await withAuth();
            if (!auth.user || !auth.accessToken) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const actor = await fetchQuery(api.actors.me, {}, { token: auth.accessToken });
            if (!actor) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            actorId = actor._id;
            token = auth.accessToken;
        }

        await recordAndEnqueueJob({
            token,
            actorId,
            siteId: body.siteId,
            type: body.type,
            resourceType: body.resourceType,
            resourceId: body.resourceId,
            source: body.source,
            payload: body.payload,
            dedupeKey: body.dedupeKey,
        });

        return NextResponse.json({ ok: true }, { status: 202 });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        const message = error instanceof Error ? error.message : String(error);
        console.error('Job enqueue error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
