import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import type { FunctionArgs } from 'convex/server';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { enqueueDeviceConfigureJobs } from '@/lib/resource-jobs';

export const runtime = 'nodejs';

type UpdateDeviceBody = {
    name?: string;
    description?: string;
    tags?: string[];
    status?: 'pending' | 'active';
    frameId?: Id<'frames'> | null;
    dataBindings?: FunctionArgs<typeof api.devices.crud.update>['dataBindings'];
    wakePolicy?: FunctionArgs<typeof api.devices.crud.update>['wakePolicy'] | null;
    manualEntries?: FunctionArgs<typeof api.devices.crud.saveManualData>['entries'];
    siteSlug?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string; deviceId: string }> }) {
    try {
        const { siteId, deviceId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.device.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const token = authorization.accessToken;
        const body = (await request.json()) as UpdateDeviceBody;

        await fetchMutation(
            api.devices.crud.update,
            {
                id: deviceId as Id<'devices'>,
                name: body.name,
                description: body.description,
                tags: body.tags,
                status: body.status,
                frameId: body.frameId ?? undefined,
                dataBindings: body.frameId ? body.dataBindings : undefined,
                wakePolicy: body.wakePolicy ?? undefined,
                clearFrame: body.frameId === null,
                clearWakePolicy: body.wakePolicy === null,
            },
            { token },
        );

        let enqueueWarning: string | null = null;

        if (body.frameId && body.siteSlug) {
            const manualSave = await fetchMutation(
                api.devices.crud.saveManualData,
                {
                    deviceId: deviceId as Id<'devices'>,
                    entries: body.manualEntries ?? [],
                },
                { token },
            );

            const enqueueResult = await enqueueDeviceConfigureJobs({
                token,
                actorId: authorization.actor._id,
                deviceId: deviceId as Id<'devices'>,
                siteId: siteId as Id<'sites'>,
                siteSlug: body.siteSlug,
                normalizationRecordIds: manualSave.normalizationRecordIds,
            });
            enqueueWarning = enqueueResult.warning;
        }

        return NextResponse.json({ ok: true, enqueueWarning });
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

export async function DELETE(request: Request, context: { params: Promise<{ siteId: string; deviceId: string }> }) {
    try {
        const { siteId, deviceId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.device.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });

        await fetchMutation(
            api.devices.crud.remove,
            { id: deviceId as Id<'devices'> },
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
