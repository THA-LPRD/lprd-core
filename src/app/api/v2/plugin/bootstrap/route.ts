import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { authenticatePlugin, AuthError } from '@/lib/plugin/auth';
import { convex } from '@/lib/convex';

export async function POST(request: Request) {
    try {
        const plugin = await authenticatePlugin(request);
        const body = await request.json();

        if (!body?.baseUrl || typeof body.baseUrl !== 'string') {
            return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
        }

        await convex.mutation(api.plugins.registration.registerMetadata, {
            id: plugin._id,
            baseUrl: body.baseUrl,
            version: typeof body.version === 'string' ? body.version : undefined,
            topics: Array.isArray(body.topics) ? body.topics : undefined,
            configSchema: body.configSchema,
            healthCheckIntervalMs:
                typeof body.healthCheckIntervalMs === 'number' && body.healthCheckIntervalMs >= 30_000
                    ? body.healthCheckIntervalMs
                    : undefined,
            description: typeof body.description === 'string' ? body.description : undefined,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
