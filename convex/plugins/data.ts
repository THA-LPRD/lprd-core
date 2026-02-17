import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { deleteImageBlobs, isTemplateData } from '../lib/template_data';

/**
 * Store data pushed by a plugin via webhook.
 * Validates the plugin exists and is active.
 * Schedules image processing if data contains img fields.
 */
export const storeWebhookData = internalMutation({
    args: {
        pluginUuid: v.string(),
        orgSlug: v.string(),
        contentType: v.string(),
        data: v.any(),
        ttlSeconds: v.number(),
    },
    handler: async (ctx, args) => {
        const plugin = await ctx.db
            .query('plugins')
            .withIndex('by_plugin_id', (q) => q.eq('id', args.pluginUuid))
            .unique();

        if (!plugin) throw new Error('Plugin not found');
        if (plugin.status !== 'active') throw new Error(`Plugin is not active (status: ${plugin.status})`);

        const org = await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.orgSlug))
            .unique();

        if (!org) throw new Error(`Organization not found: ${args.orgSlug}`);

        const now = Date.now();
        const id = await ctx.db.insert('pluginData', {
            pluginId: plugin._id,
            organizationId: org._id,
            contentType: args.contentType,
            data: args.data,
            ttlSeconds: args.ttlSeconds,
            expiresAt: now + args.ttlSeconds * 1000,
            receivedAt: now,
        });

        // Schedule image processing if data has img fields
        if (isTemplateData(args.data)) {
            const hasUnprocessed = Object.values(args.data).some((f) => f.type === 'img' && !f.storageId);
            if (hasUnprocessed) {
                await ctx.scheduler.runAfter(0, internal.plugins.images.processPluginDataImages, {
                    pluginDataId: id,
                });
            }
        }
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
