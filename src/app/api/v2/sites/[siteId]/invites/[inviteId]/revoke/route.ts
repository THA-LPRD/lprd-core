import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ siteId: string; inviteId: string }> }) {
    try {
        const { siteId, inviteId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.actor.manage, {
            request,
            siteId: siteId as Id<'sites'>,
        });

        await fetchMutation(
            api.siteInvites.revoke,
            {
                siteId: siteId as Id<'sites'>,
                inviteId: inviteId as Id<'siteInvites'>,
            },
            { token: authorization.accessToken },
        );

        return NextResponse.json({ ok: true });
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
