import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@shared/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

type CreateInviteBody = {
    publicId?: unknown;
};

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
    try {
        const { siteId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.actor.manage, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const body = (await request.json()) as CreateInviteBody;
        const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : '';

        if (!publicId) {
            return NextResponse.json({ error: 'publicId is required' }, { status: 400 });
        }

        const inviteId = await fetchMutation(
            api.siteInvites.createByPublicId,
            { siteId: siteId as Id<'sites'>, actorPublicId: publicId },
            { token: authorization.accessToken },
        );

        return NextResponse.json({ id: inviteId }, { status: 201 });
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
