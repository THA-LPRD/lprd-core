import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import type { DataModel, Id } from '../_generated/dataModel';

type MutationCtx = GenericMutationCtx<DataModel>;
type QueryCtx = GenericQueryCtx<DataModel>;

/**
 * Generate an upload URL for Convex file storage.
 */
export function generateUploadUrl(ctx: MutationCtx) {
    return ctx.storage.generateUploadUrl();
}

/**
 * Replace a thumbnail on a document that has `thumbnailStorageId`.
 * Deletes the old thumbnail from storage if one exists.
 */
export async function replaceThumbnail(
    ctx: MutationCtx,
    docId: Id<'templates'> | Id<'frames'>,
    storageId: Id<'_storage'>,
) {
    const doc = await ctx.db.get(docId);
    if (!doc) throw new Error('Document not found');

    if ('thumbnailStorageId' in doc && doc.thumbnailStorageId) {
        await ctx.storage.delete(doc.thumbnailStorageId as Id<'_storage'>);
    }

    await ctx.db.patch(docId, {
        thumbnailStorageId: storageId,
        updatedAt: Date.now(),
    } as Record<string, unknown>);
}

/**
 * Fetch templates by IDs and return a map of `{ templateHtml, sampleData }`.
 * Used by device and frame render bundles.
 */
export async function fetchTemplateMap(
    ctx: QueryCtx,
    templateIds: Iterable<string>,
): Promise<Record<string, { templateHtml: string; sampleData?: unknown }>> {
    const templates: Record<string, { templateHtml: string; sampleData?: unknown }> = {};
    for (const tid of templateIds) {
        const t = await ctx.db.get(tid as Id<'templates'>);
        if (t) {
            templates[tid] = { templateHtml: t.templateHtml, sampleData: t.sampleData };
        }
    }
    return templates;
}
