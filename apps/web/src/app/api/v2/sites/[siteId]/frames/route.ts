import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@shared/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { GRID_COLS, GRID_ROWS } from '@shared/render/constants';

export const runtime = 'nodejs';

type CreateFrameBody = {
    name?: string;
    description?: string;
};

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
    try {
        const { siteId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.frame.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const body = (await request.json()) as CreateFrameBody;

        if (!body.name?.trim()) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const frameId = await fetchMutation(
            api.frames.create,
            {
                siteId: siteId as Id<'sites'>,
                name: body.name.trim(),
                description: body.description?.trim() || undefined,
                widgets: [
                    {
                        id: crypto.randomUUID(),
                        x: 0,
                        y: 0,
                        w: GRID_COLS,
                        h: GRID_ROWS,
                    },
                ],
            },
            { token: authorization.accessToken },
        );

        return NextResponse.json({ id: frameId }, { status: 201 });
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
