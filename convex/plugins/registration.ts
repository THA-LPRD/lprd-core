import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';

const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * Get a plugin by its UUID string.
 * Used by httpAction endpoints that receive plugin ID from headers.
 */
export const getByUuid = internalQuery({
    args: { uuid: v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query('plugins')
            .withIndex('by_plugin_id', (q) => q.eq('id', args.uuid))
            .unique();
    },
});

/**
 * Register a new plugin. Called from the /api/v2/plugin/register httpAction.
 * Generates a UUID and inserts with status 'pending'.
 */
export const registerPlugin = internalMutation({
    args: {
        id: v.string(),
        name: v.string(),
        version: v.string(),
        description: v.optional(v.string()),
        configSchema: v.optional(v.any()),
        baseUrl: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if a plugin with this base URL already exists
        const existing = await ctx.db
            .query('plugins')
            .filter((q) => q.eq(q.field('baseUrl'), args.baseUrl))
            .first();

        if (existing) return { pluginId: existing._id, id: existing.id, alreadyExists: true };

        const now = Date.now();
        const pluginId = await ctx.db.insert('plugins', {
            id: args.id,
            name: args.name,
            version: args.version,
            description: args.description,
            configSchema: args.configSchema,
            status: 'pending',
            baseUrl: args.baseUrl,
            healthCheckIntervalMs: DEFAULT_HEALTH_CHECK_INTERVAL_MS,
            createdAt: now,
            updatedAt: now,
        });

        return { pluginId, id: args.id, alreadyExists: false };
    },
});
