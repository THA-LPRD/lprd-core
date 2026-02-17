import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { internal } from '../_generated/api';
import { templateVariant } from '../schema';
import { getPermissions } from '../lib/acl';
import { deleteImageBlobs, isTemplateData, resolveImageUrls } from '../lib/template_data';
import { getCurrentUser, getMembership } from '../users';

/**
 * List all templates available to an organization (global + org-scoped).
 * Requires template.view permission.
 */
export const listByOrganization = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.template.view) return [];

        const globalTemplates = await ctx.db
            .query('templates')
            .withIndex('by_scope', (q) => q.eq('scope', 'global'))
            .collect();

        const orgTemplates = await ctx.db
            .query('templates')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
            .collect();

        // Resolve thumbnail URLs
        const all = [...globalTemplates, ...orgTemplates];
        return Promise.all(
            all.map(async (t) => {
                let thumbnailUrl: string | null = null;
                if (t.thumbnailStorageId) {
                    thumbnailUrl = await ctx.storage.getUrl(t.thumbnailStorageId);
                }
                return { ...t, thumbnailUrl };
            }),
        );
    },
});

/**
 * Get a single template by ID.
 * Requires template.view permission for org-scoped templates.
 * Resolves img field storageIds to serving URLs.
 */
export const getById = query({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const template = await ctx.db.get(args.id);
        if (!template) return null;

        // Global templates are visible to any authenticated user
        if (template.scope === 'org' && template.organizationId) {
            const membership = await getMembership(ctx, user._id, template.organizationId);
            const perms = getPermissions(user, membership);
            if (!perms.template.view) return null;
        }

        let thumbnailUrl: string | null = null;
        if (template.thumbnailStorageId) {
            thumbnailUrl = await ctx.storage.getUrl(template.thumbnailStorageId);
        }

        // Resolve image URLs in sampleData
        let sampleData = template.sampleData;
        if (isTemplateData(sampleData)) {
            sampleData = await resolveImageUrls(ctx, sampleData);
        }

        return { ...template, sampleData, thumbnailUrl };
    },
});

/**
 * Create a new org-scoped template.
 * Requires template.manage permission.
 */
export const create = mutation({
    args: {
        organizationId: v.id('organizations'),
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        const now = Date.now();
        const id = await ctx.db.insert('templates', {
            scope: 'org',
            organizationId: args.organizationId,
            createdBy: user._id,
            name: args.name,
            description: args.description,
            templateHtml: args.templateHtml,
            sampleData: args.sampleData,
            variants: args.variants,
            preferredVariantIndex: args.preferredVariantIndex,
            createdAt: now,
            updatedAt: now,
        });

        // Schedule image processing if sampleData has img fields
        if (isTemplateData(args.sampleData)) {
            const hasUnprocessed = Object.values(args.sampleData).some((f) => f.type === 'img' && !f.storageId);
            if (hasUnprocessed) {
                await ctx.scheduler.runAfter(0, internal.templates.images.processTemplateImages, {
                    templateId: id,
                });
            }
        }

        return id;
    },
});

/**
 * Update an org-scoped template.
 * Requires template.manage permission. Rejects global templates.
 */
export const update = mutation({
    args: {
        id: v.id('templates'),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        templateHtml: v.optional(v.string()),
        sampleData: v.optional(v.any()),
        variants: v.optional(v.array(templateVariant)),
        preferredVariantIndex: v.optional(v.number()),
        thumbnailStorageId: v.optional(v.id('_storage')),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope === 'global') throw new Error('Cannot edit global templates');

        const membership = await getMembership(ctx, user._id, template.organizationId!);
        const perms = getPermissions(user, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        const { id, ...updates } = args;
        void id;
        await ctx.db.patch(template._id, { ...updates, updatedAt: Date.now() });

        // Schedule image processing if sampleData changed and has img fields
        if (args.sampleData !== undefined && isTemplateData(args.sampleData)) {
            const hasUnprocessed = Object.values(args.sampleData).some((f) => f.type === 'img' && !f.storageId);
            if (hasUnprocessed) {
                await ctx.scheduler.runAfter(0, internal.templates.images.processTemplateImages, {
                    templateId: template._id,
                });
            }
        }
    },
});

/**
 * Delete an org-scoped template.
 * Requires template.manage permission. Rejects global templates.
 * Cleans up thumbnail and image storage blobs.
 */
export const remove = mutation({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope === 'global') throw new Error('Cannot delete global templates');

        const membership = await getMembership(ctx, user._id, template.organizationId!);
        const perms = getPermissions(user, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        if (template.thumbnailStorageId) {
            await ctx.storage.delete(template.thumbnailStorageId);
        }

        // Clean up image blobs in sampleData
        await deleteImageBlobs(ctx, template.sampleData);

        await ctx.db.delete(template._id);
    },
});

/**
 * Duplicate any template as a new org-scoped template.
 * Requires template.manage permission on the target org.
 */
export const duplicate = mutation({
    args: {
        id: v.id('templates'),
        organizationId: v.id('organizations'),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        const source = await ctx.db.get(args.id);
        if (!source) throw new Error('Template not found');

        const now = Date.now();
        return ctx.db.insert('templates', {
            scope: 'org',
            organizationId: args.organizationId,
            createdBy: user._id,
            name: `${source.name} (Copy)`,
            description: source.description,
            templateHtml: source.templateHtml,
            sampleData: source.sampleData,
            variants: source.variants,
            preferredVariantIndex: source.preferredVariantIndex,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Save a thumbnail storage reference on a template.
 * Requires template.manage permission.
 */
export const storeThumbnail = mutation({
    args: {
        id: v.id('templates'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope === 'global') throw new Error('Cannot modify global templates');

        const membership = await getMembership(ctx, user._id, template.organizationId!);
        const perms = getPermissions(user, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        if (template.thumbnailStorageId) {
            await ctx.storage.delete(template.thumbnailStorageId);
        }

        await ctx.db.patch(template._id, {
            thumbnailStorageId: args.storageId,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Generate an upload URL for template thumbnails.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        return ctx.storage.generateUploadUrl();
    },
});
