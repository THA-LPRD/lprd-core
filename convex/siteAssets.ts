import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalQuery, mutation, query } from './_generated/server';
import { requirePermission, resolveAuthorization } from './lib/authz';
import { permissionCatalog } from './lib/permissions';

/**
 * Generate a Convex storage upload URL.
 * Client uploads directly to this URL, then calls `create` with the returned storageId.
 * Requires `org.site.asset.manage`.
 */
export const generateUploadUrl = mutation({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        await requirePermission(ctx, permissionCatalog.org.site.asset.manage, { siteId: args.siteId });
        return ctx.storage.generateUploadUrl();
    },
});

/**
 * Create an asset record after the file has been uploaded to storage.
 * Requires `org.site.asset.manage`.
 */
export const create = mutation({
    args: {
        siteId: v.id('sites'),
        storageId: v.id('_storage'),
        filename: v.string(),
        contentType: v.string(),
    },
    handler: async (ctx, args) => {
        const authorization = await requirePermission(ctx, permissionCatalog.org.site.asset.manage, {
            siteId: args.siteId,
        });

        const assetId = await ctx.db.insert('siteAssets', {
            siteId: args.siteId,
            storageId: args.storageId,
            filename: args.filename,
            contentType: args.contentType,
            uploadedBy: authorization.actor._id,
            createdAt: Date.now(),
        });

        const url = await ctx.storage.getUrl(args.storageId);
        return { assetId, url };
    },
});

/**
 * List all assets for a site with serving URLs.
 * Requires `org.site.asset.view`.
 */
export const list = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.asset.view)) return [];

        const assets = await ctx.db
            .query('siteAssets')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .order('desc')
            .collect();

        return Promise.all(
            assets.map(async (asset) => ({
                ...asset,
                url: await ctx.storage.getUrl(asset.storageId),
            })),
        );
    },
});

/**
 * Remove an asset record and its storage blob.
 * Requires `org.site.asset.manage`.
 */
export const remove = mutation({
    args: { assetId: v.id('siteAssets') },
    handler: async (ctx, args) => {
        const asset = await ctx.db.get(args.assetId);
        if (!asset) throw new Error('Asset not found');

        await requirePermission(ctx, permissionCatalog.org.site.asset.manage, { siteId: asset.siteId });

        await ctx.storage.delete(asset.storageId);
        await ctx.db.delete(args.assetId);
    },
});

/**
 * Internal: verify a storageId belongs to the given site.
 * Used by saveManualData to reject unauthorized storage IDs.
 */
export const checkStorageIdBelongsToSite = internalQuery({
    args: { storageId: v.id('_storage'), siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const asset = await ctx.db
            .query('siteAssets')
            .withIndex('by_storage', (q) => q.eq('storageId', args.storageId))
            .unique();
        return asset?.siteId === args.siteId;
    },
});

/**
 * Internal: resolve all img(storageId) markers in a data tree to img(servingUrl).
 * Unrecognized or missing storage IDs are left as-is.
 */
export async function resolveImgStorageIds(
    data: unknown,
    getUrl: (storageId: Id<'_storage'>) => Promise<string | null>,
): Promise<unknown> {
    if (typeof data === 'string') {
        const match = /^img\((.+)\)$/.exec(data);
        if (match) {
            const url = await getUrl(match[1] as Id<'_storage'>);
            return url ? `img(${url})` : data;
        }
        return data;
    }
    if (Array.isArray(data)) {
        return Promise.all(data.map((item) => resolveImgStorageIds(item, getUrl)));
    }
    if (typeof data === 'object' && data !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
            if (key === '_imageBlobs') continue;
            result[key] = await resolveImgStorageIds(val, getUrl);
        }
        return result;
    }
    return data;
}
