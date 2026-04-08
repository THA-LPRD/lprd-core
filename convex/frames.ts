import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { frameLayer, frameWidget } from './schema';
import { permissionCatalog } from './lib/permissions';
import { requirePermission, resolveAuthorization } from './lib/authz';
import { fetchTemplateMap, generateUploadUrl, replaceThumbnail } from './lib/storage';
import { markFrameJobSucceeded } from './jobs/frameJobs';

/**
 * List all frames for a site.
 * Requires `org.site.frame.view`.
 */
export const listBySite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.frame.view)) return [];

        const frames = await ctx.db
            .query('frames')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        return Promise.all(
            frames.map(async (frame) => {
                let thumbnailUrl: string | null = null;
                if (frame.thumbnailStorageId) {
                    thumbnailUrl = await ctx.storage.getUrl(frame.thumbnailStorageId);
                }
                return { ...frame, thumbnailUrl };
            }),
        );
    },
});

/**
 * Get a single frame by ID.
 * Requires `org.site.frame.view`.
 */
export const getById = query({
    args: { id: v.id('frames') },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) return null;

        const authorization = await resolveAuthorization(ctx, { siteId: frame.siteId });
        if (!authorization?.can(permissionCatalog.org.site.frame.view)) return null;

        let thumbnailUrl: string | null = null;
        if (frame.thumbnailStorageId) {
            thumbnailUrl = await ctx.storage.getUrl(frame.thumbnailStorageId);
        }

        return { ...frame, thumbnailUrl };
    },
});

/**
 * Create a new frame.
 * Requires `org.site.frame.manage`.
 */
export const create = mutation({
    args: {
        siteId: v.id('sites'),
        name: v.string(),
        description: v.optional(v.string()),
        widgets: v.array(frameWidget),
        background: v.optional(frameLayer),
        backgroundColor: v.optional(v.string()),
        foreground: v.optional(frameLayer),
    },
    handler: async (ctx, args) => {
        const authorization = await requirePermission(ctx, permissionCatalog.org.site.frame.manage.self, {
            siteId: args.siteId,
        });
        const { actor } = authorization;

        const now = Date.now();
        return ctx.db.insert('frames', {
            siteId: args.siteId,
            createdBy: actor._id,
            name: args.name,
            description: args.description,
            widgets: args.widgets,
            background: args.background,
            backgroundColor: args.backgroundColor,
            foreground: args.foreground,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Update a frame.
 * Requires `org.site.frame.manage`.
 */
export const update = mutation({
    args: {
        id: v.id('frames'),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        widgets: v.optional(v.array(frameWidget)),
        background: v.optional(frameLayer),
        backgroundColor: v.optional(v.string()),
        foreground: v.optional(frameLayer),
        clearBackground: v.optional(v.boolean()),
        clearBackgroundColor: v.optional(v.boolean()),
        clearForeground: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.self, { siteId: frame.siteId });

        const { id, clearBackground, clearBackgroundColor, clearForeground, ...updates } = args;
        void id;

        const patch: Record<string, unknown> = { ...updates, updatedAt: Date.now() };

        if (clearBackground) {
            patch.background = undefined;
        }
        if (clearBackgroundColor) {
            patch.backgroundColor = undefined;
        }
        if (clearForeground) {
            patch.foreground = undefined;
        }

        await ctx.db.patch(frame._id, patch);
    },
});

/**
 * Delete a frame and its thumbnail.
 * Requires `org.site.frame.manage`.
 */
export const remove = mutation({
    args: { id: v.id('frames') },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.self, { siteId: frame.siteId });

        if (frame.thumbnailStorageId) {
            await ctx.storage.delete(frame.thumbnailStorageId);
        }

        await ctx.db.delete(frame._id);
    },
});

/**
 * Duplicate a frame within a site.
 * Requires `org.site.frame.manage`.
 */
export const duplicate = mutation({
    args: {
        id: v.id('frames'),
        siteId: v.id('sites'),
    },
    handler: async (ctx, args) => {
        const authorization = await requirePermission(ctx, permissionCatalog.org.site.frame.manage.self, {
            siteId: args.siteId,
        });
        const { actor } = authorization;

        const source = await ctx.db.get(args.id);
        if (!source) throw new Error('Frame not found');

        const now = Date.now();
        return ctx.db.insert('frames', {
            siteId: args.siteId,
            createdBy: actor._id,
            name: `${source.name} (Copy)`,
            description: source.description,
            widgets: source.widgets,
            background: source.background,
            foreground: source.foreground,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get everything needed to render a frame in one query.
 * Requires `org.site.frame.view`.
 * Used by the Playwright render page and worker artifact routes.
 */
export const getRenderBundle = query({
    args: { frameId: v.id('frames') },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) return null;

        const authorization = await resolveAuthorization(ctx, { siteId: frame.siteId });
        if (!authorization) throw new Error('Render bundle: not authenticated');

        if (!authorization.can(permissionCatalog.org.site.frame.view)) {
            throw new Error('Render bundle: frame.view permission denied');
        }

        const templateIds = new Set<string>();
        for (const w of frame.widgets) {
            if (w.templateId) templateIds.add(w.templateId);
        }
        if (frame.background) templateIds.add(frame.background.templateId);
        if (frame.foreground) templateIds.add(frame.foreground.templateId);

        const templates = await fetchTemplateMap(ctx, templateIds);
        return { frame, templates };
    },
});

export const storeThumbnailForJob = mutation({
    args: {
        id: v.id('frames'),
        storageId: v.id('_storage'),
        jobId: v.optional(v.id('jobs')),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.thumbnail.write, { siteId: frame.siteId });
        await replaceThumbnail(ctx, args.id, args.storageId);

        if (args.jobId) {
            await markFrameJobSucceeded(ctx, args.jobId, args.id);
        }
    },
});

export const createThumbnailUploadUrl = mutation({
    args: { id: v.id('frames') },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.thumbnail.write, { siteId: frame.siteId });
        return generateUploadUrl(ctx);
    },
});
