import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { getCurrentUser } from '../users';
import { fetchTemplateMap, generateUploadUrl as generateUploadUrlImpl } from '../lib/storage';

/**
 * Set the next render for a device. Cleans up old next blob if present.
 * Called from Next.js after Playwright renders the device.
 */
export const setNext = mutation({
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
 * Generate an upload URL for device render images.
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
 * Get everything needed to render a device in one query.
 * No auth — used only by the Playwright render page.
 * Returns device, frame, templates, and resolved binding data.
 */
export const getRenderBundle = query({
    args: { deviceId: v.id('devices') },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device?.frameId) return null;

        const frame = await ctx.db.get(device.frameId);
        if (!frame) return null;

        // Collect template IDs
        const templateIds = new Set<string>();
        for (const w of frame.widgets) {
            if (w.templateId) templateIds.add(w.templateId);
        }
        if (frame.background) templateIds.add(frame.background.templateId);
        if (frame.foreground) templateIds.add(frame.foreground.templateId);

        const templates = await fetchTemplateMap(ctx, templateIds);

        // Resolve binding data
        const bindingData: Record<string, Record<string, unknown>> = {};
        if (device.dataBindings) {
            for (const binding of device.dataBindings) {
                const record = await ctx.db
                    .query('pluginData')
                    .withIndex('by_plugin_site_topic_entry', (q) =>
                        q
                            .eq('pluginId', binding.pluginId)
                            .eq('siteId', device.siteId)
                            .eq('topic', binding.topic)
                            .eq('entry', binding.entry),
                    )
                    .unique();

                if (!record) continue;

                const data = record.data as Record<string, unknown>;

                if (!bindingData[binding.widgetId]) {
                    bindingData[binding.widgetId] = {};
                }
                Object.assign(bindingData[binding.widgetId], data);
            }
        }

        return { device, frame, templates, bindingData };
    },
});
