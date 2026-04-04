import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { authenticateWorkerRequest } from '@/lib/api-auth';
import { AuthError } from '@/lib/application/auth';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await authenticateWorkerRequest(request);
        const token = request.headers.get('authorization')?.slice(7);
        if (!token) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
        const { id } = await context.params;
        const body = (await request.json()) as { sampleData?: unknown };
        if (body.sampleData === undefined) {
            return NextResponse.json({ error: 'sampleData is required' }, { status: 400 });
        }
        await fetchMutation(
            api.templates.crud.patchSampleDataForJob,
            { id: id as Id<'templates'>, sampleData: body.sampleData },
            { token },
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker patch template sample data error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
