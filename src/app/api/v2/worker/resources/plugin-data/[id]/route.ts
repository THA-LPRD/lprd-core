import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { authenticateWorkerRequest } from '@/lib/api-auth';
import { AuthError } from '@/lib/application/auth';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await authenticateWorkerRequest(request);
        const token = request.headers.get('authorization')?.slice(7);
        if (!token) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
        const { id } = await context.params;
        const record = await fetchQuery(
            api.applications.plugin.data.getByIdForJob,
            { id: id as Id<'pluginData'> },
            { token },
        );
        return NextResponse.json(record);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker get plugin data error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
