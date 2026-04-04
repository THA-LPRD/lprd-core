import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from '../../_generated/server';
import { healthCheckStatus } from '../../schema';
import { getCurrentActor } from '../../actors';
import { getPermissions } from '../../lib/acl';
import { requireInternalRenderScope } from '../../lib/internal_render';

/** Number of consecutive failures before marking unhealthy */
const UNHEALTHY_THRESHOLD = 3;

/**
 * List recent health checks for a plugin (paginated). AppAdmin only.
 */
export const listByPlugin = query({
    args: {
        pluginId: v.id('applications'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return { page: [], isDone: true, continueCursor: '' };
        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) return { page: [], isDone: true, continueCursor: '' };

        return await ctx.db
            .query('pluginHealthChecks')
            .withIndex('by_application_and_time', (q) => q.eq('applicationId', args.pluginId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const listDueForHealthCheck = query({
    args: {},
    handler: async (ctx) => {
        await requireInternalRenderScope(ctx);

        const now = Date.now();
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

            if (!plugin) continue;
            if (now - (plugin.lastHealthCheckAt ?? 0) < plugin.healthCheckIntervalMs) continue;

            const siteAccess = await ctx.db
                .query('pluginSiteAccess')
                .withIndex('by_application', (q) => q.eq('applicationId', app._id))
                .first();

            results.push({
                applicationId: app._id,
                actorId: app.actorId,
                siteId: siteAccess?.siteId ?? null,
                baseUrl: plugin.baseUrl,
            });
        }

        return results;
    },
});

export const recordHealthCheck = mutation({
    args: {
        pluginId: v.id('applications'),
        status: healthCheckStatus,
        responseTimeMs: v.optional(v.number()),
        pluginVersion: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireInternalRenderScope(ctx);

        const now = Date.now();

        await ctx.db.insert('pluginHealthChecks', {
            applicationId: args.pluginId,
            status: args.status,
            responseTimeMs: args.responseTimeMs,
            pluginVersion: args.pluginVersion,
            errorMessage: args.errorMessage,
            checkedAt: now,
        });

        let healthStatus: 'healthy' | 'degraded' | 'unhealthy';

        if (args.status === 'healthy') {
            healthStatus = 'healthy';
        } else {
            const recentChecks = await ctx.db
                .query('pluginHealthChecks')
                .withIndex('by_application_and_time', (q) => q.eq('applicationId', args.pluginId))
                .order('desc')
                .take(UNHEALTHY_THRESHOLD);

            const consecutiveFailures = recentChecks.filter((c) => c.status !== 'healthy').length;
            healthStatus = consecutiveFailures >= UNHEALTHY_THRESHOLD ? 'unhealthy' : 'degraded';
        }

        const plugin = await ctx.db
            .query('pluginProfiles')
            .withIndex('by_application', (q) => q.eq('applicationId', args.pluginId))
            .unique();

        if (!plugin) throw new Error('Plugin record not found');

        await ctx.db.patch(plugin._id, {
            lastHealthCheckAt: now,
            healthStatus,
            updatedAt: now,
        });
    },
});
