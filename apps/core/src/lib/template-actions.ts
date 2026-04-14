import type { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { requestJson } from '@shared/api-client';
import type { FunctionArgs } from 'convex/server';

type TemplateUpdateInput = Omit<FunctionArgs<typeof api.templates.crud.update>, 'id'>;

export async function createSiteTemplate(input: {
    siteId: Id<'sites'>;
    siteSlug: string;
    name: string;
    description?: string;
}) {
    return requestJson<{ id: Id<'templates'>; enqueueWarning: string | null }>(
        `/api/v2/sites/${input.siteId}/templates`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: input.name,
                description: input.description,
                siteSlug: input.siteSlug,
            }),
        },
    );
}

export async function updateSiteTemplate(
    input: {
        siteId: Id<'sites'>;
        templateId: Id<'templates'>;
        siteSlug: string;
    } & TemplateUpdateInput,
) {
    return requestJson<{ ok: true; enqueueWarning: string | null }>(
        `/api/v2/sites/${input.siteId}/templates/${input.templateId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: input.name,
                description: input.description,
                templateHtml: input.templateHtml,
                sampleData: input.sampleData,
                variants: input.variants,
                preferredVariantIndex: input.preferredVariantIndex,
                thumbnailStorageId: input.thumbnailStorageId,
                siteSlug: input.siteSlug,
            }),
        },
    );
}

export async function deleteSiteTemplate(input: { siteId: Id<'sites'>; templateId: Id<'templates'> }) {
    return requestJson<{ ok: true }>(`/api/v2/sites/${input.siteId}/templates/${input.templateId}`, {
        method: 'DELETE',
    });
}

export async function duplicateSiteTemplate(input: {
    siteId: Id<'sites'>;
    templateId: Id<'templates'>;
    siteSlug: string;
}) {
    return requestJson<{ id: Id<'templates'>; enqueueWarning: string | null }>(
        `/api/v2/sites/${input.siteId}/templates/${input.templateId}/duplicate`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteSlug: input.siteSlug }),
        },
    );
}
