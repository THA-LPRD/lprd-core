import { v } from 'convex/values';
import { internalQuery, mutation, query } from '../_generated/server';
import { getCurrentUser, getMembership } from '../users';
import { getPermissions } from '../lib/acl';

/**
 * Toggle enabledByOrg for a plugin in the current org.
 * OrgAdmin only. Cannot enable if plugin is not active or enabledByAdmin is false.
 */
export const toggleOrgAccess = mutation({
    args: {
        pluginId: v.id('plugins'),
        organizationId: v.id('organizations'),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.plugin.orgManage) throw new Error('Not authorized');

        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin || plugin.status !== 'active') throw new Error('Plugin not available');

        // Check existing access record
        const existing = await ctx.db
            .query('pluginOrgAccess')
            .withIndex('by_plugin_and_org', (q) =>
                q.eq('pluginId', args.pluginId).eq('organizationId', args.organizationId),
            )
            .unique();

        const now = Date.now();

        if (existing) {
            // Cannot enable if admin has blocked
            if (args.enabled && !existing.enabledByAdmin) {
                throw new Error('Plugin is blocked by platform admin for this organization');
            }
            await ctx.db.patch(existing._id, {
                enabledByOrg: args.enabled,
                updatedByOrg: user._id,
                updatedAt: now,
            });
        } else {
            // Create new access record
            await ctx.db.insert('pluginOrgAccess', {
                pluginId: args.pluginId,
                organizationId: args.organizationId,
                enabledByAdmin: true,
                enabledByOrg: args.enabled,
                updatedByOrg: user._id,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

/**
 * Set enabledByAdmin for a plugin in a specific org. AppAdmin only.
 */
export const setAdminAccess = mutation({
    args: {
        pluginId: v.id('plugins'),
        organizationId: v.id('organizations'),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) throw new Error('Not authorized');

        const existing = await ctx.db
            .query('pluginOrgAccess')
            .withIndex('by_plugin_and_org', (q) =>
                q.eq('pluginId', args.pluginId).eq('organizationId', args.organizationId),
            )
            .unique();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                enabledByAdmin: args.enabled,
                updatedByAdmin: user._id,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert('pluginOrgAccess', {
                pluginId: args.pluginId,
                organizationId: args.organizationId,
                enabledByAdmin: args.enabled,
                enabledByOrg: false,
                updatedByAdmin: user._id,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

/**
 * List active plugins with access status for an org.
 * OrgAdmins see only plugins that are active + enabledByAdmin.
 * AppAdmins see all active plugins with both flags.
 */
export const listForOrg = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.plugin.orgManage) return [];

        const isAppAdmin = perms.plugin.manage;

        // Get all active plugins
        const plugins = await ctx.db
            .query('plugins')
            .withIndex('by_status', (q) => q.eq('status', 'active'))
            .collect();

        const results = [];
        for (const plugin of plugins) {
            // System plugins are internal — not shown in org settings
            if (plugin.type === 'system') continue;

            const access = await ctx.db
                .query('pluginOrgAccess')
                .withIndex('by_plugin_and_org', (q) =>
                    q.eq('pluginId', plugin._id).eq('organizationId', args.organizationId),
                )
                .unique();

            const enabledByAdmin = access?.enabledByAdmin ?? true;
            const enabledByOrg = access?.enabledByOrg ?? false;

            // OrgAdmins can't see admin-blocked plugins
            if (!isAppAdmin && !enabledByAdmin) continue;

            results.push({
                _id: plugin._id,
                name: plugin.name,
                description: plugin.description,
                enabledByAdmin,
                enabledByOrg,
                isAppAdmin,
            });
        }

        return results;
    },
});

/**
 * List all orgs and their access status for a specific plugin. AppAdmin only.
 */
export const listForPlugin = query({
    args: { pluginId: v.id('plugins') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) return [];

        const orgs = await ctx.db.query('organizations').collect();
        const results = [];

        for (const org of orgs) {
            const access = await ctx.db
                .query('pluginOrgAccess')
                .withIndex('by_plugin_and_org', (q) =>
                    q.eq('pluginId', args.pluginId).eq('organizationId', org._id),
                )
                .unique();

            results.push({
                _id: org._id,
                name: org.name,
                slug: org.slug,
                enabledByAdmin: access?.enabledByAdmin ?? true,
                enabledByOrg: access?.enabledByOrg ?? false,
            });
        }

        return results;
    },
});

/**
 * Boolean check: plugin active + enabledByAdmin + enabledByOrg.
 * Used by the API route auth helper.
 */
export const checkAccess = internalQuery({
    args: {
        pluginId: v.id('plugins'),
        orgSlug: v.string(),
    },
    handler: async (ctx, args) => {
        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin || plugin.status !== 'active') return false;

        const org = await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.orgSlug))
            .unique();
        if (!org) return false;

        const access = await ctx.db
            .query('pluginOrgAccess')
            .withIndex('by_plugin_and_org', (q) =>
                q.eq('pluginId', args.pluginId).eq('organizationId', org._id),
            )
            .unique();

        if (!access) return false;
        return access.enabledByAdmin && access.enabledByOrg;
    },
});
