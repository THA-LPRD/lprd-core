import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { authenticateWorkerRequest } from '@/lib/api-auth';
import { AuthError } from '@/lib/application/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        await authenticateWorkerRequest(request);
        const token = request.headers.get('authorization')?.slice(7);
        if (!token) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
        const duePlugins = await fetchQuery(api.applications.plugin.health.listDueForHealthCheck, {}, { token });
        return NextResponse.json(duePlugins);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker due health checks error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
