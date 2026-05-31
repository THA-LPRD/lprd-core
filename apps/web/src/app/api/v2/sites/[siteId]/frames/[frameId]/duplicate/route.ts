import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@shared/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ siteId: string; frameId: string }> }) {
    try {
        const { siteId, frameId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.frame.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });

        const duplicatedFrameId = await fetchMutation(
            api.frames.duplicate,
            { id: frameId as Id<'frames'>, siteId: siteId as Id<'sites'> },
            { token: authorization.accessToken },
        );

        return NextResponse.json({ id: duplicatedFrameId }, { status: 201 });
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
