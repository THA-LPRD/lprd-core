import { v } from 'convex/values';
import { httpAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { pluginTopic } from '../schema';

const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * Get a plugin by its Convex ID.
 * Used by httpAction endpoints that receive plugin ID from headers.
 */
export const getById = internalQuery({
    args: { id: v.id('plugins') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/**
 * Register a new plugin. Called from the /api/v2/plugin/register httpAction.
 * Inserts with status 'pending'. Returns the Convex _id.
 */
export const registerPlugin = internalMutation({
    args: {
        name: v.string(),
        version: v.string(),
        description: v.optional(v.string()),
        configSchema: v.optional(v.any()),
        baseUrl: v.string(),
        topics: v.array(pluginTopic),
    },
    handler: async (ctx, args) => {
        // Check if a plugin with this base URL already exists
        const existing = await ctx.db
            .query('plugins')
            .filter((q) => q.eq(q.field('baseUrl'), args.baseUrl))
            .first();

        if (existing) return { pluginId: existing._id, alreadyExists: true };

        const now = Date.now();
        const pluginId = await ctx.db.insert('plugins', {
            name: args.name,
            version: args.version,
            description: args.description,
            configSchema: args.configSchema,
            status: 'pending',
            baseUrl: args.baseUrl,
            topics: args.topics,
            healthCheckIntervalMs: DEFAULT_HEALTH_CHECK_INTERVAL_MS,
            createdAt: now,
            updatedAt: now,
        });

        return { pluginId, alreadyExists: false };
    },
});

/**
 * POST /api/v2/plugin/register
 * Registers a new plugin. Returns 201 with { registration_id }.
 */
export const handlePluginRegister = httpAction(async (ctx, request) => {
    try {
        const body = await request.json();

        const { name, version, description, config_schema, base_url, topics } = body;
        if (!name || !version || !base_url) {
            return new Response(JSON.stringify({ error: 'name, version, and base_url are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Generate internal IDs for each topic entry
        const topicsWithIds = Array.isArray(topics)
            ? topics.map((t: { key: string; label: string; description?: string }) => ({
                  id: crypto.randomUUID(),
                  key: t.key,
                  label: t.label,
                  description: t.description,
              }))
            : [];

        const result = await ctx.runMutation(internal.plugins.registration.registerPlugin, {
            name,
            version,
            description: description ?? undefined,
            configSchema: config_schema ?? undefined,
            baseUrl: base_url,
            topics: topicsWithIds,
        });

        const status = result.alreadyExists ? 200 : 201;
        return new Response(JSON.stringify({ registration_id: result.pluginId }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Plugin registration error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
