import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';
import { resolveAuthorization } from '../lib/authz';
import { permissionCatalog } from '../lib/permissions';
import { deviceLogStatus, deviceLogType } from '../schema';

// ---------------------------------------------------------------------------
// Internal mutations — called from Next.js API routes
// ---------------------------------------------------------------------------

/**
 * Log a device access event.
 */
export const log = internalMutation({
    args: {
        deviceId: v.id('devices'),
        macAddress: v.string(),
        type: deviceLogType,
        ipAddress: v.optional(v.string()),
        responseStatus: deviceLogStatus,
        imageChanged: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('deviceAccessLogs', {
            deviceId: args.deviceId,
            macAddress: args.macAddress,
            type: args.type,
            ipAddress: args.ipAddress,
            responseStatus: args.responseStatus,
            imageChanged: args.imageChanged,
            accessedAt: Date.now(),
        });
    },
});

/**
 * Log a config_fetch event and write a data snapshot when imageChanged is true.
 */
export const logWithSnapshot = internalMutation({
    args: {
        deviceId: v.id('devices'),
        macAddress: v.string(),
        ipAddress: v.optional(v.string()),
        responseStatus: deviceLogStatus,
        imageChanged: v.boolean(),
        bindingData: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const logId = await ctx.db.insert('deviceAccessLogs', {
            deviceId: args.deviceId,
            macAddress: args.macAddress,
            type: 'config_fetch',
            ipAddress: args.ipAddress,
            responseStatus: args.responseStatus,
            imageChanged: args.imageChanged,
            accessedAt: now,
        });

        if (args.imageChanged && args.bindingData != null) {
            await ctx.db.insert('deviceDataSnapshots', {
                deviceId: args.deviceId,
                logId,
                data: args.bindingData,
                createdAt: now,
            });
        }
    },
});

// ---------------------------------------------------------------------------
// Queries — used by the UI
// ---------------------------------------------------------------------------

/**
 * Paginated list of access log entries for a device.
 * Requires `org.site.device.view`.
 */
export const list = query({
    args: {
        deviceId: v.id('devices'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device) return { page: [], isDone: true, continueCursor: '' };

        const authorization = await resolveAuthorization(ctx, { siteId: device.siteId });
        if (!authorization?.can(permissionCatalog.org.site.device.view)) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        return ctx.db
            .query('deviceAccessLogs')
            .withIndex('by_device_and_time', (q) => q.eq('deviceId', args.deviceId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

/**
 * Aggregated per-day access counts for the sparkline.
 * Returns entries sorted oldest-first so the chart renders left→right.
 */
export const getDailyStats = query({
    args: {
        deviceId: v.id('devices'),
        days: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device) return [];

        const authorization = await resolveAuthorization(ctx, { siteId: device.siteId });
        if (!authorization?.can(permissionCatalog.org.site.device.view)) return [];

        const days = args.days ?? 7;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

        const logs = await ctx.db
            .query('deviceAccessLogs')
            .withIndex('by_device_and_time', (q) => q.eq('deviceId', args.deviceId).gte('accessedAt', cutoff))
            .collect();

        // Bucket by UTC date string YYYY-MM-DD
        const buckets = new Map<string, { total: number; byType: Record<string, number> }>();

        // Pre-fill all days (oldest first)
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().slice(0, 10);
            buckets.set(key, { total: 0, byType: {} });
        }

        for (const entry of logs) {
            const key = new Date(entry.accessedAt).toISOString().slice(0, 10);
            const bucket = buckets.get(key);
            if (!bucket) continue;
            bucket.total += 1;
            bucket.byType[entry.type] = (bucket.byType[entry.type] ?? 0) + 1;
        }

        return Array.from(buckets.entries()).map(([date, stats]) => ({ date, ...stats }));
    },
});

/**
 * All log entries for a single day (used by sparkline hover tooltip).
 */
export const listByDay = query({
    args: {
        deviceId: v.id('devices'),
        date: v.string(), // 'YYYY-MM-DD'
    },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device) return [];

        const authorization = await resolveAuthorization(ctx, { siteId: device.siteId });
        if (!authorization?.can(permissionCatalog.org.site.device.view)) return [];

        const start = new Date(`${args.date}T00:00:00.000Z`).getTime();
        const end = start + 24 * 60 * 60 * 1000;

        return ctx.db
            .query('deviceAccessLogs')
            .withIndex('by_device_and_time', (q) =>
                q.eq('deviceId', args.deviceId).gte('accessedAt', start).lt('accessedAt', end),
            )
            .order('asc')
            .collect();
    },
});
