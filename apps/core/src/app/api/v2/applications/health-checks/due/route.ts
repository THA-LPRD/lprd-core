import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { permissionCatalog } from '@/lib/permissions';
import { AuthError } from '@shared/auth-errors';
import { requirePermission } from '@/lib/authz';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const authorization = await requirePermission(permissionCatalog.org.actor.serviceAccount.healthCheck.read, {
            request,
        });
        const token = authorization.accessToken;
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
