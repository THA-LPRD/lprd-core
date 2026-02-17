import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { TemplateData } from '../lib/template_data';
import { isTemplateData } from '../lib/template_data';

/**
 * Download external images from img fields in pluginData,
 * store them in Convex storage, and patch the record.
 */
export const processPluginDataImages = internalAction({
    args: { pluginDataId: v.id('pluginData') },
    handler: async (ctx, args) => {
        const record = await ctx.runQuery(internal.plugins.images.getPluginDataById, {
            id: args.pluginDataId,
        });
        if (!record) return;

        const data = record.data;
        if (!isTemplateData(data)) return;

        let changed = false;
        const updated: TemplateData = { ...data };

        for (const [key, field] of Object.entries(updated)) {
            if (field.type !== 'img' || field.storageId) continue;

            try {
                const response = await fetch(field.url);
                if (!response.ok) continue;

                const blob = await response.blob();
                const storageId = await ctx.storage.store(blob);
                updated[key] = { ...field, storageId };
                changed = true;
            } catch {
                // Skip fields that fail to download
            }
        }

        if (changed) {
            await ctx.runMutation(internal.plugins.images.patchPluginData, {
                pluginDataId: args.pluginDataId,
                data: updated,
            });
        }
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
