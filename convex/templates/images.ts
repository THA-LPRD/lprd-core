import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { extractImageUrls, replaceImgUrls } from '../lib/template_data';

/**
 * Download external images from img() markers in sampleData,
 * store them in Convex storage, and patch the template with resolved URLs.
 */
export const processTemplateImages = internalAction({
    args: { templateId: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.runQuery(internal.templates.images.getByIdInternal, {
            id: args.templateId,
        });
        if (!template) return;

        const data = template.sampleData;
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

        await ctx.runMutation(internal.templates.images.patchSampleData, {
            templateId: args.templateId,
            sampleData: withBlobs,
        });
    },
});

/** Internal query to read a template without permission checks (for actions). */
export const getByIdInternal = internalQuery({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/** Internal mutation to patch sampleData after image processing. */
export const patchSampleData = internalMutation({
    args: {
        templateId: v.id('templates'),
        sampleData: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.templateId, {
            sampleData: args.sampleData,
            updatedAt: Date.now(),
        });
    },
});
