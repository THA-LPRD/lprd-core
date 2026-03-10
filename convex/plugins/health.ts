import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, internalQuery, query } from '../_generated/server';
import { healthCheckStatus } from '../schema';
import { getCurrentUser } from '../users';
import { getPermissions } from '../lib/acl';

/** Number of consecutive failures before marking unhealthy */
const UNHEALTHY_THRESHOLD = 3;

/**
 * List active external plugins that are overdue for a health check.
 * System plugins are excluded — they don't have external endpoints.
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
            .filter((p) => p.type !== 'system')
            .filter((p) => now - (p.lastHealthCheckAt ?? 0) >= p.healthCheckIntervalMs)
            .map((p) => ({
                _id: p._id,
                baseUrl: p.baseUrl,
                healthCheckIntervalMs: p.healthCheckIntervalMs,
                lastHealthCheckAt: p.lastHealthCheckAt,
            }));
    },
});

/**
 * List recent health checks for a plugin (paginated). AppAdmin only.
 */
export const listByPlugin = query({
    args: {
        pluginId: v.id('plugins'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return { page: [], isDone: true, continueCursor: '' };
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) return { page: [], isDone: true, continueCursor: '' };

        return await ctx.db
            .query('pluginHealthChecks')
            .withIndex('by_plugin_and_time', (q) => q.eq('pluginId', args.pluginId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

/**
 * Record a health check result, update lastHealthCheckAt, and derive healthStatus.
 * Called by the worker after checking a plugin's /health endpoint.
 *
 * healthStatus logic:
 * - healthy: last check was healthy
 * - degraded: 1-2 consecutive unhealthy/error checks
 * - unhealthy: 3+ consecutive unhealthy/error checks
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

        // Derive healthStatus from recent checks
        let healthStatus: 'healthy' | 'degraded' | 'unhealthy';

        if (args.status === 'healthy') {
            healthStatus = 'healthy';
        } else {
            // Count consecutive failures (including this one)
            const recentChecks = await ctx.db
                .query('pluginHealthChecks')
                .withIndex('by_plugin_and_time', (q) => q.eq('pluginId', args.pluginId))
                .order('desc')
                .take(UNHEALTHY_THRESHOLD);

            const consecutiveFailures = recentChecks.filter((c) => c.status !== 'healthy').length;
            healthStatus = consecutiveFailures >= UNHEALTHY_THRESHOLD ? 'unhealthy' : 'degraded';
        }

        await ctx.db.patch(args.pluginId, {
            lastHealthCheckAt: now,
            healthStatus,
            updatedAt: now,
        });
    },
});
