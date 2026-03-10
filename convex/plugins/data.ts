import { v } from 'convex/values';
import { internalMutation, internalQuery, query } from '../_generated/server';
import { internal } from '../_generated/api';
import { containsImgFuncs, deleteImageBlobs } from '../lib/template_data';
import { getCurrentUser, getMembership } from '../users';
import { getPermissions } from '../lib/acl';

/**
 * Store data pushed by a plugin via webhook.
 * Upserts by (pluginId, organizationId, topic, entry).
 * Schedules image processing if data contains img fields.
 */
export const storeWebhookData = internalMutation({
    args: {
        pluginId: v.id('plugins'),
        orgSlug: v.string(),
        contentType: v.string(),
        data: v.any(),
        ttlSeconds: v.number(),
        topic: v.string(),
        entry: v.string(),
    },
    handler: async (ctx, args) => {
        const plugin = await ctx.db.get(args.pluginId);

        if (!plugin) throw new Error('Plugin not found');
        if (plugin.status !== 'active') throw new Error(`Plugin is not active (status: ${plugin.status})`);

        const org = await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.orgSlug))
            .unique();

        if (!org) throw new Error(`Organization not found: ${args.orgSlug}`);

        const now = Date.now();

        // Check for existing record (upsert)
        const existing = await ctx.db
            .query('pluginData')
            .withIndex('by_plugin_org_topic_entry', (q) =>
                q
                    .eq('pluginId', plugin._id)
                    .eq('organizationId', org._id)
                    .eq('topic', args.topic)
                    .eq('entry', args.entry),
            )
            .unique();

        let id;
        if (existing) {
            // Clean up old image blobs before overwriting
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
                pluginId: plugin._id,
                organizationId: org._id,
                topic: args.topic,
                entry: args.entry,
                contentType: args.contentType,
                data: args.data,
                ttlSeconds: args.ttlSeconds,
                expiresAt: now + args.ttlSeconds * 1000,
                receivedAt: now,
            });
        }

        // Schedule image processing if data has img() markers
        if (containsImgFuncs(args.data)) {
            await ctx.scheduler.runAfter(0, internal.plugins.images.processPluginDataImages, {
                pluginDataId: id,
            });
        }

        return { pluginId: plugin._id, organizationId: org._id, orgSlug: org.slug };
    },
});

/**
 * Generate an upload URL for device render images.
 * Called from the Next.js webhook route via admin auth.
 */
export const generateRenderUploadUrl = internalMutation({
    args: {},
    handler: async (ctx) => {
        return ctx.storage.generateUploadUrl();
    },
});

/**
 * Set device.next render. Called from the Next.js webhook route via admin auth.
 */
export const setDeviceNext = internalMutation({
    args: {
        deviceId: v.id('devices'),
        storageId: v.id('_storage'),
        renderedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device) return;

        if (device.next?.storageId) {
            await ctx.storage.delete(device.next.storageId);
        }

        await ctx.db.patch(device._id, {
            next: { storageId: args.storageId, renderedAt: args.renderedAt },
        });
    },
});

/**
 * Delete a pluginData record and clean up any img storage blobs.
 */
export const deletePluginData = internalMutation({
    args: { id: v.id('pluginData') },
    handler: async (ctx, args) => {
        const record = await ctx.db.get(args.id);
        if (!record) return;

        await deleteImageBlobs(ctx, record.data);
        await ctx.db.delete(record._id);
    },
});

/**
 * Find devices affected by a data change.
 * Returns device Convex IDs whose bindings match the given plugin + topic + entry.
 * Called from the Next.js webhook route to know which devices need re-rendering.
 */
export const listAffectedDevices = internalQuery({
    args: {
        pluginId: v.id('plugins'),
        organizationId: v.id('organizations'),
        topic: v.string(),
        entry: v.string(),
    },
    handler: async (ctx, args) => {
        const devices = await ctx.db
            .query('devices')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
            .collect();

        return devices
            .filter((d) => {
                if (!d.dataBindings || !d.frameId) return false;
                return d.dataBindings.some(
                    (b) => b.pluginId === args.pluginId && b.topic === args.topic && b.entry === args.entry,
                );
            })
            .map((d) => d._id);
    },
});

/**
 * List active plugins that have topics and are enabled for the given org.
 * Used by the device config UI plugin picker.
 */
export const listPluginsWithTopics = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return [];

        const plugins = await ctx.db
            .query('plugins')
            .withIndex('by_status', (q) => q.eq('status', 'active'))
            .collect();

        const results = [];
        for (const p of plugins) {
            if (p.topics.length === 0) continue;

            // System plugins are internal — not shown in the data binding picker
            if (p.type === 'system') continue;

            // External plugins need org access
            const access = await ctx.db
                .query('pluginOrgAccess')
                .withIndex('by_plugin_and_org', (q) =>
                    q.eq('pluginId', p._id).eq('organizationId', args.organizationId),
                )
                .unique();

            if (!access || !access.enabledByAdmin || !access.enabledByOrg) continue;

            results.push({
                _id: p._id,
                name: p.name,
                topics: p.topics,
            });
        }

        return results;
    },
});

/**
 * List distinct entries for a given plugin + org + topic.
 * Used by the entry picker in device config UI.
 */
export const listEntries = query({
    args: {
        pluginId: v.id('plugins'),
        organizationId: v.id('organizations'),
        topic: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return [];

        const records = await ctx.db
            .query('pluginData')
            .withIndex('by_plugin_org_topic_entry', (q) =>
                q.eq('pluginId', args.pluginId).eq('organizationId', args.organizationId).eq('topic', args.topic),
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
