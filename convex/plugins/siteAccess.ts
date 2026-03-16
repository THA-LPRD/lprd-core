import { v } from 'convex/values';
import { internalQuery, mutation, query } from '../_generated/server';
import { getCurrentUser, getMembership } from '../users';
import { getPermissions } from '../lib/acl';

/**
 * Toggle enabledBySite for a plugin in the current site.
 * SiteAdmin only. Cannot enable if plugin is not active or enabledByAdmin is false.
 */
export const toggleSiteAccess = mutation({
    args: {
        pluginId: v.id('plugins'),
        siteId: v.id('sites'),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.siteId);
        const perms = getPermissions(user, membership);
        if (!perms.plugin.siteManage) throw new Error('Not authorized');

        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin || plugin.status !== 'active') throw new Error('Plugin not available');

        // Check existing access record
        const existing = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_plugin_and_site', (q) => q.eq('pluginId', args.pluginId).eq('siteId', args.siteId))
            .unique();

        const now = Date.now();

        if (existing) {
            // Cannot enable if admin has blocked
            if (args.enabled && !existing.enabledByAdmin) {
                throw new Error('Plugin is blocked by platform admin for this site');
            }
            await ctx.db.patch(existing._id, {
                enabledBySite: args.enabled,
                updatedBySite: user._id,
                updatedAt: now,
            });
        } else {
            // Create new access record
            await ctx.db.insert('pluginSiteAccess', {
                pluginId: args.pluginId,
                siteId: args.siteId,
                enabledByAdmin: true,
                enabledBySite: args.enabled,
                updatedBySite: user._id,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

/**
 * Set enabledByAdmin for a plugin in a specific site. AppAdmin only.
 */
export const setAdminAccess = mutation({
    args: {
        pluginId: v.id('plugins'),
        siteId: v.id('sites'),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) throw new Error('Not authorized');

        const existing = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_plugin_and_site', (q) => q.eq('pluginId', args.pluginId).eq('siteId', args.siteId))
            .unique();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                enabledByAdmin: args.enabled,
                updatedByAdmin: user._id,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert('pluginSiteAccess', {
                pluginId: args.pluginId,
                siteId: args.siteId,
                enabledByAdmin: args.enabled,
                enabledBySite: false,
                updatedByAdmin: user._id,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

/**
 * List active plugins with access status for a site.
 * SiteAdmins see only plugins that are active + enabledByAdmin.
 * AppAdmins see all active plugins with both flags.
 */
export const listForSite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.siteId);
        const perms = getPermissions(user, membership);
        if (!perms.plugin.siteManage) return [];

        const isAppAdmin = perms.plugin.manage;

        // Get all active plugins
        const plugins = await ctx.db
            .query('plugins')
            .withIndex('by_status', (q) => q.eq('status', 'active'))
            .collect();

        const results = [];
        for (const plugin of plugins) {
            // System plugins are internal — not shown in site settings
            if (plugin.type === 'system') continue;

            const access = await ctx.db
                .query('pluginSiteAccess')
                .withIndex('by_plugin_and_site', (q) => q.eq('pluginId', plugin._id).eq('siteId', args.siteId))
                .unique();

            const enabledByAdmin = access?.enabledByAdmin ?? true;
            const enabledBySite = access?.enabledBySite ?? false;

            // SiteAdmins can't see admin-blocked plugins
            if (!isAppAdmin && !enabledByAdmin) continue;

            results.push({
                _id: plugin._id,
                name: plugin.name,
                description: plugin.description,
                enabledByAdmin,
                enabledBySite,
                isAppAdmin,
            });
        }

        return results;
    },
});

/**
 * List all sites and their access status for a specific plugin. AppAdmin only.
 */
export const listForPlugin = query({
    args: { pluginId: v.id('plugins') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) return [];

        const sites = await ctx.db.query('sites').collect();
        const results = [];

        for (const site of sites) {
            const access = await ctx.db
                .query('pluginSiteAccess')
                .withIndex('by_plugin_and_site', (q) => q.eq('pluginId', args.pluginId).eq('siteId', site._id))
                .unique();

            results.push({
                _id: site._id,
                name: site.name,
                slug: site.slug,
                enabledByAdmin: access?.enabledByAdmin ?? true,
                enabledBySite: access?.enabledBySite ?? false,
            });
        }

        return results;
    },
});

/**
 * Boolean check: plugin active + enabledByAdmin + enabledBySite.
 * Used by the API route auth helper.
 */
export const checkAccess = internalQuery({
    args: {
        pluginId: v.id('plugins'),
        siteSlug: v.string(),
    },
    handler: async (ctx, args) => {
        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin || plugin.status !== 'active') return false;

        const site = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.siteSlug))
            .unique();
        if (!site) return false;

        const access = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_plugin_and_site', (q) => q.eq('pluginId', args.pluginId).eq('siteId', site._id))
            .unique();

        if (!access) return false;
        return access.enabledByAdmin && access.enabledBySite;
    },
});
