import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { extractImageUrls, replaceImgUrls } from '../lib/template_data';

/**
 * Download external images from img() markers in pluginData,
 * store them in Convex storage, and patch the record with resolved URLs.
 */
export const processPluginDataImages = internalAction({
    args: { pluginDataId: v.id('pluginData') },
    handler: async (ctx, args) => {
        const record = await ctx.runQuery(internal.plugins.images.getPluginDataById, {
            id: args.pluginDataId,
        });
        if (!record) return;

        const data = record.data;
        const urls = extractImageUrls(data);
        if (urls.length === 0) return;

        const urlMap = new Map<string, { url: string; storageId: string }>();
        const imageBlobs: Record<string, string> = {};

        for (const externalUrl of urls) {
            try {
                const response = await fetch(externalUrl);
                if (!response.ok) continue;

                const blob = await response.blob();
                const storageId = await ctx.storage.store(blob);
                const servingUrl = await ctx.storage.getUrl(storageId);
                if (!servingUrl) continue;

                urlMap.set(externalUrl, { url: servingUrl, storageId });
                imageBlobs[externalUrl] = storageId;
            } catch {
                // Skip URLs that fail to download
            }
        }

        if (urlMap.size === 0) return;

        const updated = replaceImgUrls(data, urlMap);
        const withBlobs =
            typeof updated === 'object' && updated !== null && !Array.isArray(updated)
                ? { ...(updated as Record<string, unknown>), _imageBlobs: imageBlobs }
                : updated;

        await ctx.runMutation(internal.plugins.images.patchPluginData, {
            pluginDataId: args.pluginDataId,
            data: withBlobs,
        });
    },
});

/** Internal query to read pluginData without permission checks (for actions). */
export const getPluginDataById = internalQuery({
    args: { id: v.id('pluginData') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/** Internal mutation to patch pluginData after image processing. */
export const patchPluginData = internalMutation({
    args: {
        pluginDataId: v.id('pluginData'),
        data: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.pluginDataId, { data: args.data });
    },
});
