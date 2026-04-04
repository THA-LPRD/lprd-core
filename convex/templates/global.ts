import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { templateVariant } from '../schema';
import { containsImgFuncs, deleteImageBlobs } from '../lib/template_data';
import { getCurrentActor } from '../actors';

export const upsertGlobalForApplication = mutation({
    args: {
        pluginId: v.id('applications'),
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
        version: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const application = await ctx.db.get(args.pluginId);
        if (!application || application.actorId !== actor._id) throw new Error('Not authorized for this plugin');

        const existing = await ctx.db
            .query('templates')
            .withIndex('by_application_and_name', (q) => q.eq('applicationId', args.pluginId).eq('name', args.name))
            .unique();

        const now = Date.now();

        if (existing) {
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

            return { id: existing._id, created: false, needsNormalization: containsImgFuncs(args.sampleData) };
        }

        const id = await ctx.db.insert('templates', {
            scope: 'global',
            applicationId: args.pluginId,
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

        return { id, created: true, needsNormalization: containsImgFuncs(args.sampleData) };
    },
});
