import { v } from 'convex/values';
import { mutation, query } from '../../_generated/server';
import { getSiteActor } from '../../actors';
import { markPluginDataJobSucceeded } from '../../jobs/pluginDataJobs';
import { permissionCatalog } from '../../lib/permissions';
import { requireAuthorization, requirePermission, resolveAuthorization } from '../../lib/authz';
import { containsImgFuncs, deleteImageBlobs } from '../../lib/template_data';
import { generateUploadUrl } from '../../lib/storage';

/**
 * List active plugins that have topics and are enabled for the given site.
 * Used by the device config UI plugin picker.
 */
export const listPluginsWithTopics = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.device.view)) return [];

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

            const siteActor = await getSiteActor(ctx, app.actorId, args.siteId);
            if (!siteActor) continue;

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
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.device.view)) return [];

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
        const record = await ctx.db.get(args.id);
        if (!record) return null;

        await requirePermission(ctx, permissionCatalog.org.site.pluginData.view, { siteId: record.siteId });
        return record;
    },
});

export const createDataUploadUrl = mutation({
    args: { id: v.id('pluginData') },
    handler: async (ctx, args) => {
        const record = await ctx.db.get(args.id);
        if (!record) throw new Error('Plugin data not found');

        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.self, { siteId: record.siteId });
        return generateUploadUrl(ctx);
    },
});

export const getStoredDataFileUrl = query({
    args: {
        id: v.id('pluginData'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, args) => {
        const record = await ctx.db.get(args.id);
        if (!record) throw new Error('Plugin data not found');

        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.self, { siteId: record.siteId });
        return ctx.storage.getUrl(args.storageId);
    },
});

export const patchDataForJob = mutation({
    args: {
        id: v.id('pluginData'),
        data: v.any(),
        jobId: v.optional(v.id('jobs')),
    },
    handler: async (ctx, args) => {
        const record = await ctx.db.get(args.id);
        if (!record) throw new Error('Plugin data not found');

        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.self, { siteId: record.siteId });
        await ctx.db.patch(args.id, {
            data: args.data,
            receivedAt: Date.now(),
        });

        if (args.jobId) {
            await markPluginDataJobSucceeded(ctx, args.jobId, args.id);
        }
    },
});

export const storeWebhookDataForApplication = mutation({
    args: {
        siteSlug: v.string(),
        contentType: v.string(),
        data: v.any(),
        ttlSeconds: v.number(),
        topic: v.string(),
        entry: v.string(),
    },
    handler: async (ctx, args) => {
        const site = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.siteSlug))
            .unique();

        if (!site) throw new Error(`Site not found: ${args.siteSlug}`);

        const siteAuthorization = await requireAuthorization(ctx, { siteId: site._id });
        const plugin = siteAuthorization.application;
        if (!plugin) throw new Error('Forbidden');
        if (!siteAuthorization.can(permissionCatalog.org.site.pluginData.manage.self)) throw new Error('Forbidden');

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
        siteId: v.id('sites'),
        topic: v.string(),
        entry: v.string(),
    },
    handler: async (ctx, args) => {
        const site = await ctx.db.get(args.siteId);
        if (!site) throw new Error('Site not found');

        const siteAuthorization = await requireAuthorization(ctx, { siteId: args.siteId });
        const plugin = siteAuthorization.application;
        if (!plugin) throw new Error('Forbidden');
        if (!siteAuthorization.can(permissionCatalog.org.site.pluginData.manage.self)) throw new Error('Forbidden');

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        return devices
            .filter((device) => {
                if (!device.dataBindings || !device.frameId) return false;
                return device.dataBindings.some(
                    (binding) =>
                        binding.applicationId === plugin._id &&
                        binding.topic === args.topic &&
                        binding.entry === args.entry,
                );
            })
            .map((device) => ({ deviceId: device._id, siteId: device.siteId }));
    },
});
