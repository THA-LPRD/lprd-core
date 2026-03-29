import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { pluginTopic } from '../schema';

export const registerMetadata = mutation({
    args: {
        id: v.id('applications'),
        baseUrl: v.string(),
        version: v.optional(v.string()),
        topics: v.optional(v.array(pluginTopic)),
        configSchema: v.optional(v.any()),
        healthCheckIntervalMs: v.optional(v.number()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.id);
        if (!application) throw new Error('Application not found');
        if (application.type !== 'plugin') throw new Error('Only plugin applications can register metadata');
        if (application.status !== 'active')
            throw new Error(`Application is not active (status: ${application.status})`);

        const now = Date.now();

        // Description lives on the application record
        if (args.description !== undefined) {
            await ctx.db.patch(args.id, { description: args.description, updatedAt: now });
        }

        const existing = await ctx.db
            .query('pluginProfiles')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                baseUrl: args.baseUrl,
                version: args.version ?? existing.version,
                topics: args.topics ?? existing.topics,
                configSchema: args.configSchema ?? existing.configSchema,
                healthCheckIntervalMs: args.healthCheckIntervalMs ?? existing.healthCheckIntervalMs,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert('pluginProfiles', {
                applicationId: args.id,
                baseUrl: args.baseUrl,
                version: args.version ?? '0.0.0',
                topics: args.topics ?? [],
                configSchema: args.configSchema,
                healthCheckIntervalMs: args.healthCheckIntervalMs ?? 30_000,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});
