import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

type CreateDeviceBody = {
    name?: string;
    description?: string;
    tags?: string[];
};

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
    try {
        const { siteId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.device.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const body = (await request.json()) as CreateDeviceBody;

        if (!body.name?.trim()) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const deviceId = await fetchMutation(
            api.devices.crud.create,
            {
                siteId: siteId as Id<'sites'>,
                name: body.name.trim(),
                description: body.description?.trim() || undefined,
                tags: body.tags ?? [],
            },
            { token: authorization.accessToken },
        );

        return NextResponse.json({ id: deviceId }, { status: 201 });
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
