import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@shared/auth-errors';
import { requireAuthorization } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

type SettingsBody = {
    canBeFoundInOrganization?: unknown;
    canBeInvitedInOrganization?: unknown;
};

export async function PUT(request: Request, context: { params: Promise<{ actorId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const { actorId } = await context.params;

        if (authorization.actor._id !== actorId && !authorization.can(permissionCatalog.platform.actor.manage)) {
            throw new AuthError('Forbidden', 403);
        }

        const body = (await request.json()) as SettingsBody;

        if (
            typeof body.canBeFoundInOrganization !== 'boolean' ||
            typeof body.canBeInvitedInOrganization !== 'boolean'
        ) {
            return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
        }

        await fetchMutation(
            api.actors.updateActorSettings,
            {
                actorId: actorId as Id<'actors'>,
                canBeFoundInOrganization: body.canBeFoundInOrganization,
                canBeInvitedInOrganization: body.canBeInvitedInOrganization,
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
