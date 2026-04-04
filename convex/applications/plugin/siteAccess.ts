import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { getCurrentActor, getMembership } from '../../actors';
import { isPluginApplication } from '../../lib/applications';
import { getPermissions } from '../../lib/acl';

/**
 * Toggle enabledBySite for a plugin in the current site.
 * SiteAdmin only. Cannot enable if plugin is not active or enabledByAdmin is false.
 */
export const toggleSiteAccess = mutation({
    args: {
        pluginId: v.id('applications'),
        siteId: v.id('sites'),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.plugin.siteManage) throw new Error('Not authorized');

        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin || !isPluginApplication(plugin) || plugin.status !== 'active') {
            throw new Error('Plugin not available');
        }

        // Check existing access record
        const existing = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_application_and_site', (q) => q.eq('applicationId', args.pluginId).eq('siteId', args.siteId))
            .unique();

        const now = Date.now();
        const auditActorId = actor._id;

        if (existing) {
            // Cannot enable if admin has blocked
            if (args.enabled && !existing.enabledByAdmin) {
                throw new Error('Plugin is blocked by platform admin for this site');
            }
            await ctx.db.patch(existing._id, {
                enabledBySite: args.enabled,
                updatedBySite: auditActorId,
                updatedAt: now,
            });
        } else {
            // Create new access record
            await ctx.db.insert('pluginSiteAccess', {
                applicationId: args.pluginId,
                siteId: args.siteId,
                enabledByAdmin: true,
                enabledBySite: args.enabled,
                updatedBySite: auditActorId,
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
        pluginId: v.id('applications'),
        siteId: v.id('sites'),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');
        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) throw new Error('Not authorized');

        const existing = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_application_and_site', (q) => q.eq('applicationId', args.pluginId).eq('siteId', args.siteId))
            .unique();

        const now = Date.now();
        const auditActorId = actor._id;

        if (existing) {
            await ctx.db.patch(existing._id, {
                enabledByAdmin: args.enabled,
                updatedByAdmin: auditActorId,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert('pluginSiteAccess', {
                applicationId: args.pluginId,
                siteId: args.siteId,
                enabledByAdmin: args.enabled,
                enabledBySite: false,
                updatedByAdmin: auditActorId,
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
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.plugin.siteManage) return [];

        const isAppAdmin = perms.plugin.manage;

        // Get all active plugins
        const activePluginApps = await ctx.db
            .query('applications')
            .withIndex('by_status', (q) => q.eq('status', 'active'))
            .filter((q) => q.eq(q.field('type'), 'plugin'))
            .collect();

        const results = [];
        for (const app of activePluginApps) {
            const access = await ctx.db
                .query('pluginSiteAccess')
                .withIndex('by_application_and_site', (q) => q.eq('applicationId', app._id).eq('siteId', args.siteId))
                .unique();

            const enabledByAdmin = access?.enabledByAdmin ?? true;
            const enabledBySite = access?.enabledBySite ?? false;

            // SiteAdmins can't see admin-blocked plugins
            if (!isAppAdmin && !enabledByAdmin) continue;

            results.push({
                _id: app._id,
                name: app.name,
                description: app.description,
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
    args: { pluginId: v.id('applications') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];
        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) return [];

        const sites = await ctx.db.query('sites').collect();
        const results = [];

        for (const site of sites) {
            const access = await ctx.db
                .query('pluginSiteAccess')
                .withIndex('by_application_and_site', (q) =>
                    q.eq('applicationId', args.pluginId).eq('siteId', site._id),
                )
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

export const checkMyAccess = query({
    args: { siteSlug: v.string() },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return false;

        const application = await ctx.db
            .query('applications')
            .withIndex('by_actor', (q) => q.eq('actorId', actor._id))
            .unique();

        if (!application || application.status !== 'active') return false;

        const site = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.siteSlug))
            .unique();
        if (!site) return false;

        const access = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_application_and_site', (q) => q.eq('applicationId', application._id).eq('siteId', site._id))
            .unique();

        if (!access) return false;
        return access.enabledByAdmin && access.enabledBySite;
    },
});
