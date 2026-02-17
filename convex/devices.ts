import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { deviceStatus } from './schema';
import { getPermissions } from './lib/acl';
import { getCurrentUser, getMembership } from './users';

/**
 * Create a new device.
 * Requires device.manage permission.
 */
export const create = mutation({
    args: {
        id: v.string(), // UUIDv4
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
            id: args.id,
            organizationId: args.organizationId,
            name: args.name,
            description: args.description,
            tags: args.tags ?? [],
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get a device by its UUIDv4 id.
 * Requires device.view permission.
 */
export const getById = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
        if (!device) return null;

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return null;

        return device;
    },
});

/**
 * List devices in an organization.
 * Requires device.view permission.
 */
export const listByOrganization = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return [];

        return ctx.db
            .query('devices')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
            .collect();
    },
});

/**
 * Update a device.
 * Requires device.manage permission.
 */
export const update = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        status: v.optional(deviceStatus),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const { name, description, tags, status } = args;
        await ctx.db.patch(device._id, { name, description, tags, status, updatedAt: Date.now() });
    },
});

/**
 * Delete a device.
 * Requires device.manage permission.
 */
export const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        await ctx.db.delete(device._id);
    },
});
