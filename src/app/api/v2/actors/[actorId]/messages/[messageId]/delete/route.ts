import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ actorId: string; messageId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const { actorId, messageId } = await context.params;
        if (authorization.actor._id !== actorId && !authorization.can(permissionCatalog.platform.actor.manage)) {
            throw new AuthError('Forbidden', 403);
        }

        await fetchMutation(
            api.systemMessages.moveToDeleted,
            { actorId: actorId as Id<'actors'>, messageId: messageId as Id<'systemMessages'> },
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
