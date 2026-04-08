import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import type { FunctionArgs } from 'convex/server';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { enqueueFrameThumbnailJob } from '@/lib/resource-jobs';

export const runtime = 'nodejs';

type UpdateFrameBody = Omit<FunctionArgs<typeof api.frames.update>, 'id'> & {
    siteSlug?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string; frameId: string }> }) {
    try {
        const { siteId, frameId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.frame.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const token = authorization.accessToken;
        const body = (await request.json()) as UpdateFrameBody;

        if (!body.siteSlug) {
            return NextResponse.json({ error: 'siteSlug is required' }, { status: 400 });
        }

        await fetchMutation(
            api.frames.update,
            {
                id: frameId as Id<'frames'>,
                name: body.name,
                description: body.description,
                widgets: body.widgets,
                background: body.background,
                backgroundColor: body.backgroundColor,
                foreground: body.foreground,
                clearBackground: body.clearBackground,
                clearBackgroundColor: body.clearBackgroundColor,
                clearForeground: body.clearForeground,
            },
            { token },
        );

        const { warning } = await enqueueFrameThumbnailJob({
            token,
            actorId: authorization.actor._id,
            frameId: frameId as Id<'frames'>,
            siteId: siteId as Id<'sites'>,
            siteSlug: body.siteSlug,
        });

        return NextResponse.json({ ok: true, enqueueWarning: warning });
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

export async function DELETE(request: Request, context: { params: Promise<{ siteId: string; frameId: string }> }) {
    try {
        const { siteId, frameId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.frame.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });

        await fetchMutation(api.frames.remove, { id: frameId as Id<'frames'> }, { token: authorization.accessToken });
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
