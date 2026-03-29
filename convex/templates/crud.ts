import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { internal } from '../_generated/api';
import { templateVariant } from '../schema';
import { getPermissions } from '../lib/acl';
import { containsImgFuncs, deleteImageBlobs } from '../lib/template_data';
import { generateUploadUrl as generateUploadUrlImpl, replaceThumbnail } from '../lib/storage';
import { getCurrentActor, getMembership } from '../actors';

/**
 * List all templates available to a site (global + site-scoped).
 * Requires template.view permission.
 */
export const listBySite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.template.view) return [];

        const globalTemplates = await ctx.db
            .query('templates')
            .withIndex('by_scope', (q) => q.eq('scope', 'global'))
            .collect();

        const orgTemplates = await ctx.db
            .query('templates')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
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
 * Requires template.view permission for site-scoped templates.
 * Resolves img field storageIds to serving URLs.
 */
export const getById = query({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const template = await ctx.db.get(args.id);
        if (!template) return null;

        // Global templates are visible to any authenticated user
        if (template.scope === 'site' && template.siteId) {
            const membership = await getMembership(ctx, actor._id, template.siteId);
            const perms = getPermissions(actor, membership);
            if (!perms.template.view) return null;
        }

        let thumbnailUrl: string | null = null;
        if (template.thumbnailStorageId) {
            thumbnailUrl = await ctx.storage.getUrl(template.thumbnailStorageId);
        }

        return { ...template, thumbnailUrl };
    },
});

/**
 * Create a new site-scoped template.
 * Requires template.manage permission.
 */
export const create = mutation({
    args: {
        siteId: v.id('sites'),
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        const now = Date.now();
        const id = await ctx.db.insert('templates', {
            scope: 'site',
            siteId: args.siteId,
            createdBy: actor._id,
            name: args.name,
            description: args.description,
            templateHtml: args.templateHtml,
            sampleData: args.sampleData,
            variants: args.variants,
            preferredVariantIndex: args.preferredVariantIndex,
            createdAt: now,
            updatedAt: now,
        });

        // Schedule image processing if sampleData has img() markers
        if (containsImgFuncs(args.sampleData)) {
            await ctx.scheduler.runAfter(0, internal.templates.images.processTemplateImages, {
                templateId: id,
            });
        }

        return id;
    },
});

/**
 * Update an site-scoped template.
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
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope === 'global') throw new Error('Cannot edit global templates');

        const membership = await getMembership(ctx, actor._id, template.siteId!);
        const perms = getPermissions(actor, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        const { id, ...updates } = args;
        void id;
        await ctx.db.patch(template._id, { ...updates, updatedAt: Date.now() });

        // Schedule image processing if sampleData changed and has img() markers
        if (args.sampleData !== undefined && containsImgFuncs(args.sampleData)) {
            await ctx.scheduler.runAfter(0, internal.templates.images.processTemplateImages, {
                templateId: template._id,
            });
        }
    },
});

/**
 * Delete an site-scoped template.
 * Requires template.manage permission. Rejects global templates.
 * Cleans up thumbnail and image storage blobs.
 */
export const remove = mutation({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope === 'global') throw new Error('Cannot delete global templates');

        const membership = await getMembership(ctx, actor._id, template.siteId!);
        const perms = getPermissions(actor, membership);
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
 * Duplicate any template as a new site-scoped template.
 * Requires template.manage permission on the target site.
 */
export const duplicate = mutation({
    args: {
        id: v.id('templates'),
        siteId: v.id('sites'),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        const source = await ctx.db.get(args.id);
        if (!source) throw new Error('Template not found');

        const now = Date.now();
        return ctx.db.insert('templates', {
            scope: 'site',
            siteId: args.siteId,
            createdBy: actor._id,
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
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope === 'global') throw new Error('Cannot modify global templates');

        const membership = await getMembership(ctx, actor._id, template.siteId!);
        const perms = getPermissions(actor, membership);
        if (!perms.template.manage) throw new Error('Forbidden');

        await replaceThumbnail(ctx, args.id, args.storageId);
    },
});

/**
 * Generate an upload URL for template thumbnails.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');
        return generateUploadUrlImpl(ctx);
    },
});

/**
 * Get everything needed to render a template in one query.
 * No auth — used only by the Playwright render page.
 */
export const getRenderBundle = query({
    args: { templateId: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.templateId);
        if (!template) return null;
        return {
            templateHtml: template.templateHtml,
            sampleData: template.sampleData,
            variants: template.variants,
            preferredVariantIndex: template.preferredVariantIndex,
        };
    },
});

// --- Internal functions (no user auth, called via admin ConvexHttpClient) ---

/**
 * Get a template by ID without auth. Used by server-side operations.
 */
export const getByIdInternal = internalQuery({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/**
 * Generate an upload URL for internal use (no user auth required).
 */
export const generateUploadUrlInternal = internalMutation({
    args: {},
    handler: async (ctx) => {
        return generateUploadUrlImpl(ctx);
    },
});

/**
 * Store a thumbnail on a template. No user auth — called from plugin API routes via admin client.
 */
export const storeThumbnailInternal = internalMutation({
    args: {
        id: v.id('templates'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, args) => {
        await replaceThumbnail(ctx, args.id, args.storageId);
    },
});
