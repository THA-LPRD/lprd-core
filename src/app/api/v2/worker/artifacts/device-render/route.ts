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
            deviceId?: Id<'devices'>;
            storageId?: Id<'_storage'>;
            renderedAt?: number;
        };
        if (!body.deviceId || !body.storageId || !body.renderedAt) {
            return NextResponse.json({ error: 'deviceId, storageId, and renderedAt are required' }, { status: 400 });
        }
        await fetchMutation(
            api.jobs.setDeviceNextRender,
            {
                deviceId: body.deviceId,
                storageId: body.storageId,
                renderedAt: body.renderedAt,
            },
            { token },
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error('Worker device artifact error:', error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
