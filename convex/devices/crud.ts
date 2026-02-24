import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { deviceDataBinding, deviceStatus } from '../schema';
import { getPermissions } from '../lib/acl';
import { getCurrentUser, getMembership } from '../users';

/**
 * Create a new device.
 * Requires device.manage permission.
 */
export const create = mutation({
    args: {
        organizationId: v.id('organizations'),
        name: v.string(),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const now = Date.now();
        return ctx.db.insert('devices', {
            organizationId: args.organizationId,
            name: args.name,
            description: args.description,
            tags: args.tags ?? [],
            status: 'pending',
            apiVersion: 'v2',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get a device by its Convex ID.
 * Requires device.view permission.
 * Resolves current/next storage URLs.
 */
export const getById = query({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const device = await ctx.db.get(args.id);
        if (!device) return null;

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return null;

        let currentUrl: string | null = null;
        let nextUrl: string | null = null;

        if (device.current?.storageId) {
            currentUrl = await ctx.storage.getUrl(device.current.storageId);
        }
        if (device.next?.storageId) {
            nextUrl = await ctx.storage.getUrl(device.next.storageId);
        }

        return { ...device, currentUrl, nextUrl };
    },
});

/**
 * List devices in an organization.
 * Requires device.view permission.
 * Resolves current storage URLs for card display.
 */
export const listByOrganization = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return [];

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
            .collect();

        return Promise.all(
            devices.map(async (device) => {
                let currentUrl: string | null = null;
                if (device.current?.storageId) {
                    currentUrl = await ctx.storage.getUrl(device.current.storageId);
                }
                return { ...device, currentUrl };
            }),
        );
    },
});

/**
 * Update a device.
 * Requires device.manage permission.
 */
export const update = mutation({
    args: {
        id: v.id('devices'),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        status: v.optional(deviceStatus),
        frameId: v.optional(v.id('frames')),
        dataBindings: v.optional(v.array(deviceDataBinding)),
        clearFrame: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.id);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const { id, clearFrame, ...rest } = args;
        void id;

        const patch: Record<string, unknown> = { ...rest, updatedAt: Date.now() };

        if (clearFrame) {
            patch.frameId = undefined;
            patch.dataBindings = undefined;
        }

        await ctx.db.patch(device._id, patch);
    },
});

/**
 * Delete a device.
 * Requires device.manage permission.
 */
export const remove = mutation({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.id);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        if (device.current?.storageId) {
            await ctx.storage.delete(device.current.storageId);
        }
        if (device.next?.storageId) {
            await ctx.storage.delete(device.next.storageId);
        }

        await ctx.db.delete(device._id);
    },
});
