import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation, query } from './_generated/server';
import { getCurrentActor } from './actors';
import { getPermissions } from './lib/acl';

export const upsertFromWebhook = internalMutation({
    args: {
        externalId: v.string(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.externalId as Id<'organizations'>);

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                updatedAt: now,
            });
            return existing._id;
        } else {
            return await ctx.db.insert('organizations', {
                name: args.name,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const deleteFromWebhook = internalMutation({
    args: { externalId: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.externalId as Id<'organizations'>);

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const getById = query({
    args: { id: v.id('organizations') },
    handler: async (ctx, args) => ctx.db.get(args.id),
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
