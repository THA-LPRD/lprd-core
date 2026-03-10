import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';

/**
 * Get a plugin by its Convex ID.
 * Used by auth helpers and API routes.
 */
export const getById = internalQuery({
    args: { id: v.id('plugins') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});
