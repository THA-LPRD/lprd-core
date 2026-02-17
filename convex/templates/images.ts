import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { TemplateData } from '../lib/template_data';
import { isTemplateData } from '../lib/template_data';

/**
 * Download external images from img fields, store them in Convex storage,
 * and patch the template's sampleData with the storageId.
 */
export const processTemplateImages = internalAction({
    args: { templateId: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.runQuery(internal.templates.images.getByIdInternal, {
            id: args.templateId,
        });
        if (!template) return;

        const data = template.sampleData;
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
            await ctx.runMutation(internal.templates.images.patchSampleData, {
                templateId: args.templateId,
                sampleData: updated,
            });
        }
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
