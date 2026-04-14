import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { type DeviceDataFreshness, resolveDeviceWakePlan } from '../lib/deviceWakePolicy';

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
 * Find a device by its Convex ID. No auth.
 */
export const getById = internalQuery({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/**
 * Update lastSeen timestamp.
 */
export const heartbeat = internalMutation({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.id);
        if (!device) return null;

        await ctx.db.patch(device._id, { lastSeen: Date.now() });

        // Return the storage ID to serve (next if pending, otherwise current)
        const render = device.next ?? device.current;
        return {
            storageId: render?.storageId ?? null,
            hasNext: device.next != null,
        };
    },
});

/**
 * Promote next → current (called from the image proxy endpoint after serving).
 * Deletes the old current blob, sets current = next, clears next.
 * Returns true if a promotion occurred.
 */
export const promoteNext = internalMutation({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.id);
        if (!device?.next) return false;

        // Delete the old last blob before shifting
        if (device.last?.storageId) {
            await ctx.storage.delete(device.last.storageId);
        }

        await ctx.db.patch(device._id, {
            last: device.current,
            current: device.next,
            next: undefined,
        });

        return true;
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
 * Resolve the final device wake plan from plugin data freshness and app-owned policy.
 */
export const getWakePlan = internalQuery({
    args: { deviceId: v.id('devices') },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device) return null;

        const now = Date.now();
        const site = await ctx.db.get(device.siteId);
        if (!site) return null;

        let freshness: DeviceDataFreshness = { kind: 'unbound' };

        if (device.dataBindings?.length) {
            let minRemainingSeconds = Infinity;
            let hasMissingData = false;
            let hasStaleData = false;

            for (const binding of device.dataBindings) {
                const record = await ctx.db
                    .query('pluginData')
                    .withIndex('by_application_site_topic_entry', (q) =>
                        q
                            .eq('applicationId', binding.applicationId)
                            .eq('siteId', device.siteId)
                            .eq('topic', binding.topic)
                            .eq('entry', binding.entry),
                    )
                    .unique();

                if (!record) {
                    hasMissingData = true;
                    continue;
                }

                if (record.expiresAt <= 0) continue;

                const remainingSeconds = Math.floor((record.expiresAt - now) / 1000);
                if (remainingSeconds <= 0) {
                    hasStaleData = true;
                } else {
                    minRemainingSeconds = Math.min(minRemainingSeconds, remainingSeconds);
                }
            }

            if (hasMissingData) {
                freshness = { kind: 'missing' };
            } else if (hasStaleData) {
                freshness = { kind: 'stale' };
            } else {
                freshness = {
                    kind: 'fresh',
                    secondsUntilExpiry: minRemainingSeconds === Infinity ? null : minRemainingSeconds,
                };
            }
        }

        return resolveDeviceWakePlan({
            policy: device.wakePolicy ?? site.deviceWakePolicy,
            freshness,
            nowMs: now,
        });
    },
});

/**
 * Get the resolved binding data snapshot for a device.
 * Used to store in access logs what data the device received.
 */
export const getBindingData = internalQuery({
    args: { deviceId: v.id('devices') },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device?.dataBindings?.length) return null;

        const data: Record<string, unknown> = {};
        for (const binding of device.dataBindings) {
            const record = await ctx.db
                .query('pluginData')
                .withIndex('by_application_site_topic_entry', (q) =>
                    q
                        .eq('applicationId', binding.applicationId)
                        .eq('siteId', device.siteId)
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
