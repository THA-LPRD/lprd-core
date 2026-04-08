import type { Id } from '@convex/dataModel';
import type { FunctionArgs } from 'convex/server';
import { api } from '@convex/api';
import { requestJson } from '@/lib/api-client';

type FrameUpdateInput = Omit<FunctionArgs<typeof api.frames.update>, 'id'>;

export async function createSiteFrame(input: { siteId: Id<'sites'>; name: string; description?: string }) {
    return requestJson<{ id: Id<'frames'> }>(`/api/v2/sites/${input.siteId}/frames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: input.name,
            description: input.description,
        }),
    });
}

export async function updateSiteFrame(
    input: {
        siteId: Id<'sites'>;
        frameId: Id<'frames'>;
        siteSlug: string;
    } & FrameUpdateInput,
) {
    return requestJson<{ ok: true; enqueueWarning: string | null }>(
        `/api/v2/sites/${input.siteId}/frames/${input.frameId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: input.name,
                description: input.description,
                widgets: input.widgets,
                background: input.background,
                backgroundColor: input.backgroundColor,
                foreground: input.foreground,
                clearBackground: input.clearBackground,
                clearBackgroundColor: input.clearBackgroundColor,
                clearForeground: input.clearForeground,
                siteSlug: input.siteSlug,
            }),
        },
    );
}

export async function deleteSiteFrame(input: { siteId: Id<'sites'>; frameId: Id<'frames'> }) {
    return requestJson<{ ok: true }>(`/api/v2/sites/${input.siteId}/frames/${input.frameId}`, {
        method: 'DELETE',
    });
}

export async function duplicateSiteFrame(input: { siteId: Id<'sites'>; frameId: Id<'frames'> }) {
    return requestJson<{ id: Id<'frames'> }>(`/api/v2/sites/${input.siteId}/frames/${input.frameId}/duplicate`, {
        method: 'POST',
    });
}
