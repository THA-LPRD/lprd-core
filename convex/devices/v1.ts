import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';

// ---------------------------------------------------------------------------
// Internal functions for the v1 device API (called from Next.js API routes)
// ---------------------------------------------------------------------------

/**
 * Find a device by MAC address. No auth.
 */
export const getByMac = internalQuery({
    args: { macAddress: v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query('devices')
            .withIndex('by_mac_address', (q) => q.eq('macAddress', args.macAddress))
            .unique();
    },
});

/**
 * Update lastSeen, promote next→current if available.
 * Returns { storageId, imageChanged } or null if device not found.
 */
export const heartbeat = internalMutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
        if (!device) return null;

        const now = Date.now();
        const patch: Record<string, unknown> = { lastSeen: now };

        let imageChanged = false;

        // Promote next → current
        if (device.next) {
            if (device.current?.storageId) {
                await ctx.storage.delete(device.current.storageId);
            }
            patch.current = device.next;
            patch.next = undefined;
            imageChanged = true;
        }

        await ctx.db.patch(device._id, patch);

        const currentRender = device.next ?? device.current;
        return {
            storageId: currentRender?.storageId ?? null,
            imageChanged,
        };
    },
});

/**
 * Get a signed URL for a storage ID.
 */
export const getStorageUrl = internalQuery({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, args) => {
        return ctx.storage.getUrl(args.storageId);
    },
});

/**
 * Get the minimum TTL (in seconds) across all plugin data bindings for a device.
 * Returns -1 if no bindings or no data.
 */
export const getMinTtl = internalQuery({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.deviceId))
            .unique();
        if (!device?.dataBindings?.length) return -1;

        let minTtl = Infinity;

        for (const binding of device.dataBindings) {
            const record = await ctx.db
                .query('pluginData')
                .withIndex('by_plugin_org_topic_entry', (q) =>
                    q
                        .eq('pluginId', binding.pluginId)
                        .eq('organizationId', device.organizationId)
                        .eq('topic', binding.topic)
                        .eq('entry', binding.entry),
                )
                .unique();

            if (record) {
                minTtl = Math.min(minTtl, record.ttlSeconds);
            }
        }

        return minTtl === Infinity ? -1 : minTtl;
    },
});

/**
 * Get the resolved binding data snapshot for a device.
 * Used to store in access logs what data the device received.
 */
export const getBindingData = internalQuery({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.deviceId))
            .unique();
        if (!device?.dataBindings?.length) return null;

        const data: Record<string, unknown> = {};
        for (const binding of device.dataBindings) {
            const record = await ctx.db
                .query('pluginData')
                .withIndex('by_plugin_org_topic_entry', (q) =>
                    q
                        .eq('pluginId', binding.pluginId)
                        .eq('organizationId', device.organizationId)
                        .eq('topic', binding.topic)
                        .eq('entry', binding.entry),
                )
                .unique();

            if (record) {
                const key = `${binding.topic}/${binding.entry}`;
                data[key] = record.data;
            }
        }

        return Object.keys(data).length > 0 ? data : null;
    },
});

/**
 * Log a device access to the deviceAccessLogs table.
 */
export const logAccess = internalMutation({
    args: {
        deviceId: v.id('devices'),
        macAddress: v.string(),
        ipAddress: v.optional(v.string()),
        responseStatus: v.string(),
        imageChanged: v.boolean(),
        bindingData: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('deviceAccessLogs', {
            deviceId: args.deviceId,
            macAddress: args.macAddress,
            ipAddress: args.ipAddress,
            responseStatus: args.responseStatus,
            imageChanged: args.imageChanged,
            bindingData: args.bindingData,
            accessedAt: Date.now(),
        });
    },
});
