import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import { getCurrentActor } from './actors';
import { getPermissions } from './lib/acl';

export const upsertFromWebhook = internalMutation({
    args: {
        workosOrganizationId: v.string(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('organizations')
            .withIndex('by_workosOrganizationId', (q) => q.eq('workosOrganizationId', args.workosOrganizationId))
            .unique();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert('organizations', {
                workosOrganizationId: args.workosOrganizationId,
                name: args.name,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const deleteFromWebhook = internalMutation({
    args: {
        workosOrganizationId: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('organizations')
            .withIndex('by_workosOrganizationId', (q) => q.eq('workosOrganizationId', args.workosOrganizationId))
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const getByWorkosId = query({
    args: { workosOrganizationId: v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query('organizations')
            .withIndex('by_workosOrganizationId', (q) => q.eq('workosOrganizationId', args.workosOrganizationId))
            .unique();
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) return [];

        return ctx.db.query('organizations').collect();
    },
});
