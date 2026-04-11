import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { permissionCatalog } from '@/lib/permissions';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
    try {
        const authorization = await requirePermission(
            permissionCatalog.org.actor.serviceAccount.healthCheck.write.self,
            {
                request,
            },
        );
        const token = authorization.accessToken;
        const { applicationId } = await context.params;
        const body = (await request.json()) as {
            jobId?: Id<'jobLogs'>;
            status?: 'healthy' | 'unhealthy' | 'error';
            responseTimeMs?: number;
            pluginVersion?: string;
            errorMessage?: string;
        };

        if (!body.status) {
            return NextResponse.json({ error: 'status is required' }, { status: 400 });
        }

        await fetchMutation(
            api.applications.plugin.health.recordHealthCheck,
            {
                pluginId: applicationId as Id<'applications'>,
                status: body.status,
                responseTimeMs: body.responseTimeMs,
                pluginVersion: body.pluginVersion,
                errorMessage: body.errorMessage,
                jobId: body.jobId,
            },
            { token },
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
