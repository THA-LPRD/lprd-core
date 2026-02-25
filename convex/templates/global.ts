import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { templateVariant } from '../schema';
import { containsImgFuncs, deleteImageBlobs } from '../lib/template_data';

/**
 * Upsert a global template from a plugin.
 * Called from the plugin createTemplate endpoint.
 */
export const upsertGlobal = internalMutation({
    args: {
        pluginId: v.id('plugins'),
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
        version: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('templates')
            .withIndex('by_plugin_and_name', (q) => q.eq('pluginId', args.pluginId).eq('name', args.name))
            .unique();

        const now = Date.now();

        if (existing) {
            // Clean up old image blobs if sampleData is changing
            if (args.sampleData !== undefined) {
                await deleteImageBlobs(ctx, existing.sampleData);
            }

            await ctx.db.patch(existing._id, {
                description: args.description,
                templateHtml: args.templateHtml,
                sampleData: args.sampleData,
                variants: args.variants,
                preferredVariantIndex: args.preferredVariantIndex,
                version: args.version,
                updatedAt: now,
            });

            // Schedule image processing if data has img() markers
            if (containsImgFuncs(args.sampleData)) {
                await ctx.scheduler.runAfter(0, internal.templates.images.processTemplateImages, {
                    templateId: existing._id,
                });
            }

            return { id: existing._id, created: false };
        }

        const id = await ctx.db.insert('templates', {
            scope: 'global',
            pluginId: args.pluginId,
            name: args.name,
            description: args.description,
            templateHtml: args.templateHtml,
            sampleData: args.sampleData,
            variants: args.variants,
            preferredVariantIndex: args.preferredVariantIndex,
            version: args.version,
            createdAt: now,
            updatedAt: now,
        });

        // Schedule image processing if data has img() markers
        if (containsImgFuncs(args.sampleData)) {
            await ctx.scheduler.runAfter(0, internal.templates.images.processTemplateImages, {
                templateId: id,
            });
        }

        return { id, created: true };
    },
});
