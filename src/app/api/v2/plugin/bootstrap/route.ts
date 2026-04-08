import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization } from '@/lib/authz';
import { convex } from '@/lib/convex';

export async function POST(request: Request) {
    try {
        const authorization = await requireAuthorization({ request });
        if (!authorization.application) {
            throw new AuthError('Application not found', 401);
        }
        if (authorization.application.type !== 'plugin') {
            throw new AuthError(`Application type '${authorization.application.type}' is not allowed here`, 403);
        }

        const body = await request.json();

        if (!body?.baseUrl || typeof body.baseUrl !== 'string') {
            return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
        }

        await convex.mutation(api.applications.plugin.registration.registerMetadata, {
            id: authorization.application._id,
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
