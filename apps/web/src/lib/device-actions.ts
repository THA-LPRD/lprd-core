import type { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { requestJson } from '@shared/api-client';
import type { FunctionArgs } from 'convex/server';

type DeviceUpdateInput = Omit<
    FunctionArgs<typeof api.devices.crud.update>,
    'id' | 'frameId' | 'dataBindings' | 'wakePolicy' | 'clearFrame' | 'clearWakePolicy'
> & {
    dataBindings?: FunctionArgs<typeof api.devices.crud.update>['dataBindings'];
    wakePolicy?: FunctionArgs<typeof api.devices.crud.update>['wakePolicy'] | null;
};
type ManualEntries = FunctionArgs<typeof api.devices.crud.saveManualData>['entries'];

export async function createSiteDevice(input: {
    siteId: Id<'sites'>;
    name: string;
    description?: string;
    tags: string[];
}) {
    return requestJson<{ id: Id<'devices'> }>(`/api/v2/sites/${input.siteId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: input.name,
            description: input.description,
            tags: input.tags,
        }),
    });
}

export async function configureSiteDevice(
    input: {
        siteId: Id<'sites'>;
        deviceId: Id<'devices'>;
        siteSlug?: string;
        frameId?: Id<'frames'> | null;
        manualEntries?: ManualEntries;
    } & DeviceUpdateInput,
) {
    return requestJson<{ ok: true; enqueueWarning: string | null }>(
        `/api/v2/sites/${input.siteId}/devices/${input.deviceId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: input.name,
                description: input.description,
                tags: input.tags,
                status: input.status,
                frameId: input.frameId,
                dataBindings: input.dataBindings,
                wakePolicy: input.wakePolicy,
                siteSlug: input.siteSlug,
                manualEntries: input.manualEntries,
            }),
        },
    );
}

export async function deleteSiteDevice(input: { siteId: Id<'sites'>; deviceId: Id<'devices'> }) {
    return requestJson<{ ok: true }>(`/api/v2/sites/${input.siteId}/devices/${input.deviceId}`, {
        method: 'DELETE',
    });
}
