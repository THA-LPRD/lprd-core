import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { authenticateWorkerRequest } from '@/lib/api-auth';
import { AuthError } from '@/lib/application/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        await authenticateWorkerRequest(request);
        const token = request.headers.get('authorization')?.slice(7);
        if (!token) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
        const body = (await request.json()) as {
            applicationId?: Id<'applications'>;
            status?: 'healthy' | 'unhealthy' | 'error';
            responseTimeMs?: number;
            pluginVersion?: string;
            errorMessage?: string;
        };

        if (!body.applicationId || !body.status) {
            return NextResponse.json({ error: 'applicationId and status are required' }, { status: 400 });
        }

        await fetchMutation(
            api.applications.plugin.health.recordHealthCheck,
            {
                pluginId: body.applicationId,
                status: body.status,
                responseTimeMs: body.responseTimeMs,
                pluginVersion: body.pluginVersion,
                errorMessage: body.errorMessage,
            },
            { token },
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker health report error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
