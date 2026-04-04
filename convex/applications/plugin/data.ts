import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { containsImgFuncs, deleteImageBlobs } from '../../lib/template_data';
import { getCurrentActor, getMembership } from '../../actors';
import { getPermissions } from '../../lib/acl';
import { requireInternalRenderScope } from '../../lib/internal_render';

/**
 * Find devices affected by a data change.
 * Returns device Convex IDs whose bindings match the given application + topic + entry.
 * Called from the Next.js webhook route to know which devices need re-rendering.
 */
/**
 * List active plugins that have topics and are enabled for the given site.
 * Used by the device config UI plugin picker.
 */
export const listPluginsWithTopics = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.view) return [];

        const activePluginApps = await ctx.db
            .query('applications')
            .withIndex('by_status', (q) => q.eq('status', 'active'))
            .filter((q) => q.eq(q.field('type'), 'plugin'))
            .collect();

        const results = [];
        for (const app of activePluginApps) {
            const plugin = await ctx.db
                .query('pluginProfiles')
                .withIndex('by_application', (q) => q.eq('applicationId', app._id))
                .unique();

            if (!plugin || plugin.topics.length === 0) continue;

            const access = await ctx.db
                .query('pluginSiteAccess')
                .withIndex('by_application_and_site', (q) => q.eq('applicationId', app._id).eq('siteId', args.siteId))
                .unique();

            if (!access || !access.enabledByAdmin || !access.enabledBySite) continue;

            results.push({
                _id: app._id,
                name: app.name,
                topics: plugin.topics,
            });
        }

        return results;
    },
});

/**
 * List distinct entries for a given plugin + site + topic.
 * Used by the entry picker in device config UI.
 */
export const listEntries = query({
    args: {
        pluginId: v.id('applications'),
        siteId: v.id('sites'),
        topic: v.string(),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.view) return [];

        const records = await ctx.db
            .query('pluginData')
            .withIndex('by_application_site_topic_entry', (q) =>
                q.eq('applicationId', args.pluginId).eq('siteId', args.siteId).eq('topic', args.topic),
            )
            .collect();

        // Return distinct entries
        const seen = new Set<string>();
        return records
            .filter((r) => {
                if (seen.has(r.entry)) return false;
                seen.add(r.entry);
                return true;
            })
            .map((r) => r.entry);
    },
});

export const getByIdForJob = query({
    args: { id: v.id('pluginData') },
    handler: async (ctx, args) => {
        await requireInternalRenderScope(ctx);
        return ctx.db.get(args.id);
    },
});

export const patchDataForJob = mutation({
    args: {
        id: v.id('pluginData'),
        data: v.any(),
    },
    handler: async (ctx, args) => {
        await requireInternalRenderScope(ctx);
        await ctx.db.patch(args.id, {
            data: args.data,
            receivedAt: Date.now(),
        });
    },
});

export const storeWebhookDataForApplication = mutation({
    args: {
        pluginId: v.id('applications'),
        siteSlug: v.string(),
        contentType: v.string(),
        data: v.any(),
        ttlSeconds: v.number(),
        topic: v.string(),
        entry: v.string(),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin) throw new Error('Plugin not found');
        if (plugin.actorId !== actor._id) throw new Error('Not authorized for this plugin');
        if (plugin.status !== 'active') throw new Error(`Plugin is not active (status: ${plugin.status})`);

        const site = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.siteSlug))
            .unique();

        if (!site) throw new Error(`Site not found: ${args.siteSlug}`);

        const now = Date.now();
        const existing = await ctx.db
            .query('pluginData')
            .withIndex('by_application_site_topic_entry', (q) =>
                q
                    .eq('applicationId', plugin._id)
                    .eq('siteId', site._id)
                    .eq('topic', args.topic)
                    .eq('entry', args.entry),
            )
            .unique();

        let id;
        if (existing) {
            await deleteImageBlobs(ctx, existing.data);
            await ctx.db.patch(existing._id, {
                contentType: args.contentType,
                data: args.data,
                ttlSeconds: args.ttlSeconds,
                expiresAt: now + args.ttlSeconds * 1000,
                receivedAt: now,
            });
            id = existing._id;
        } else {
            id = await ctx.db.insert('pluginData', {
                applicationId: plugin._id,
                siteId: site._id,
                topic: args.topic,
                entry: args.entry,
                contentType: args.contentType,
                data: args.data,
                ttlSeconds: args.ttlSeconds,
                expiresAt: now + args.ttlSeconds * 1000,
                receivedAt: now,
            });
        }

        return {
            pluginDataId: id,
            pluginId: plugin._id,
            siteId: site._id,
            siteSlug: site.slug,
            needsNormalization: containsImgFuncs(args.data),
        };
    },
});

export const listAffectedDevicesForJob = query({
    args: {
        pluginId: v.id('applications'),
        siteId: v.id('sites'),
        topic: v.string(),
        entry: v.string(),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin || plugin.actorId !== actor._id) throw new Error('Not authorized for this plugin');

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        return devices
            .filter((device) => {
                if (!device.dataBindings || !device.frameId) return false;
                return device.dataBindings.some(
                    (binding) =>
                        binding.applicationId === args.pluginId &&
                        binding.topic === args.topic &&
                        binding.entry === args.entry,
                );
            })
            .map((device) => ({ deviceId: device._id, siteId: device.siteId }));
    },
});
