import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { authenticateWorkerRequest } from '@/lib/api-auth';
import { AuthError } from '@/lib/application/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        await authenticateWorkerRequest(request);
        const token = request.headers.get('authorization')?.slice(7);
        if (!token) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
        const storageId = new URL(request.url).searchParams.get('storageId');
        if (!storageId) {
            return NextResponse.json({ error: 'storageId query param is required' }, { status: 400 });
        }
        const url = await fetchQuery(api.jobs.getStorageUrl, { storageId: storageId as Id<'_storage'> }, { token });
        return NextResponse.json({ url });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker storage URL error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
