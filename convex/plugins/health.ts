import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { healthCheckStatus } from '../schema';

/**
 * List active plugins that are overdue for a health check.
 * Called by the worker scheduler on a Xs interval.
 */
export const listDueForHealthCheck = internalQuery({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const activePlugins = await ctx.db
            .query('plugins')
            .withIndex('by_status', (q) => q.eq('status', 'active'))
            .collect();

        return activePlugins
            .filter((p) => now - (p.lastHealthCheckAt ?? 0) >= p.healthCheckIntervalMs)
            .map((p) => ({
                _id: p._id,
                id: p.id,
                baseUrl: p.baseUrl,
                healthCheckIntervalMs: p.healthCheckIntervalMs,
                lastHealthCheckAt: p.lastHealthCheckAt,
            }));
    },
});

/**
 * Record a health check result and update the plugin's lastHealthCheckAt.
 * Called by the worker after checking a plugin's /health endpoint.
 */
export const recordHealthCheck = internalMutation({
    args: {
        pluginId: v.id('plugins'),
        status: healthCheckStatus,
        responseTimeMs: v.optional(v.number()),
        pluginVersion: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        await ctx.db.insert('pluginHealthChecks', {
            pluginId: args.pluginId,
            status: args.status,
            responseTimeMs: args.responseTimeMs,
            pluginVersion: args.pluginVersion,
            errorMessage: args.errorMessage,
            checkedAt: now,
        });

        await ctx.db.patch(args.pluginId, {
            lastHealthCheckAt: now,
            updatedAt: now,
        });
    },
});
