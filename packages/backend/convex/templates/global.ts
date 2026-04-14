import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { templateVariant } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission } from '../lib/authz';

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
        const authorization = await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.self);
        const { actor } = authorization;

        const application = await ctx.db.get(args.pluginId);
        if (!application || application.actorId !== actor._id) throw new Error('Not authorized for this plugin');
        if (!application.organizationId) throw new Error('Application organization required');

        const existing = await ctx.db
            .query('templates')
            .withIndex('by_application_and_name', (q) => q.eq('applicationId', args.pluginId).eq('name', args.name))
            .unique();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                description: args.description,
                templateHtml: args.templateHtml,
                sampleData: args.sampleData,
                variants: args.variants,
                preferredVariantIndex: args.preferredVariantIndex,
                version: args.version,
                updatedAt: now,
            });

            return { id: existing._id, created: false };
        }

        const id = await ctx.db.insert('templates', {
            scope: 'organization',
            organizationId: application.organizationId,
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

        return { id, created: true };
    },
});
