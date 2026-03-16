import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { frameLayer, frameWidget } from './schema';
import { getPermissions } from './lib/acl';
import { fetchTemplateMap, generateUploadUrl as generateUploadUrlImpl, replaceThumbnail } from './lib/storage';
import { getCurrentUser, getMembership } from './users';

/**
 * List all frames for an organization.
 * Requires frame.view permission.
 */
export const listByOrganization = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.view) return [];

        const frames = await ctx.db
            .query('frames')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
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
 * Requires frame.view permission.
 */
export const getById = query({
    args: { id: v.id('frames') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const frame = await ctx.db.get(args.id);
        if (!frame) return null;

        const membership = await getMembership(ctx, user._id, frame.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.view) return null;

        let thumbnailUrl: string | null = null;
        if (frame.thumbnailStorageId) {
            thumbnailUrl = await ctx.storage.getUrl(frame.thumbnailStorageId);
        }

        return { ...frame, thumbnailUrl };
    },
});

/**
 * Create a new frame.
 * Requires frame.manage permission.
 */
export const create = mutation({
    args: {
        organizationId: v.id('organizations'),
        name: v.string(),
        description: v.optional(v.string()),
        widgets: v.array(frameWidget),
        background: v.optional(frameLayer),
        backgroundColor: v.optional(v.string()),
        foreground: v.optional(frameLayer),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.manage) throw new Error('Forbidden');

        const now = Date.now();
        return ctx.db.insert('frames', {
            organizationId: args.organizationId,
            createdBy: user._id,
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
 * Requires frame.manage permission.
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
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        const membership = await getMembership(ctx, user._id, frame.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.manage) throw new Error('Forbidden');

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
 * Requires frame.manage permission.
 */
export const remove = mutation({
    args: { id: v.id('frames') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        const membership = await getMembership(ctx, user._id, frame.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.manage) throw new Error('Forbidden');

        if (frame.thumbnailStorageId) {
            await ctx.storage.delete(frame.thumbnailStorageId);
        }

        await ctx.db.delete(frame._id);
    },
});

/**
 * Duplicate a frame within an org.
 * Requires frame.manage permission.
 */
export const duplicate = mutation({
    args: {
        id: v.id('frames'),
        organizationId: v.id('organizations'),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.manage) throw new Error('Forbidden');

        const source = await ctx.db.get(args.id);
        if (!source) throw new Error('Frame not found');

        const now = Date.now();
        return ctx.db.insert('frames', {
            organizationId: args.organizationId,
            createdBy: user._id,
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
 * Save a thumbnail storage reference on a frame.
 * Requires frame.manage permission.
 */
export const storeThumbnail = mutation({
    args: {
        id: v.id('frames'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        const membership = await getMembership(ctx, user._id, frame.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.frame.manage) throw new Error('Forbidden');

        await replaceThumbnail(ctx, args.id, args.storageId);
    },
});

/**
 * Generate an upload URL for frame thumbnails.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        return generateUploadUrlImpl(ctx);
    },
});

/**
 * Get everything needed to render a frame in one query.
 * No auth — used only by the Playwright render page.
 */
export const getRenderBundle = query({
    args: { frameId: v.id('frames') },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) return null;

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
