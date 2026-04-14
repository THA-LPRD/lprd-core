import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { query } from '../../_generated/server';
import { requireAuthorization, resolveAuthorization } from '../../lib/authz';
import { permissionCatalog } from '../../lib/permissions';

export const listInstalled = query({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);

        if (!authorization.application || authorization.application.type !== 'plugin') {
            throw new Error('Forbidden');
        }

        const page = await ctx.db
            .query('siteActors')
            .withIndex('by_actor', (q) => q.eq('actorId', authorization.actor._id))
            .paginate(args.paginationOpts);

        const items = [];

        for (const siteActor of page.page) {
            const site = await ctx.db.get(siteActor.siteId);
            if (!site) continue;

            const siteAuthorization = await resolveAuthorization(ctx, { siteId: site._id });
            if (!siteAuthorization?.can(permissionCatalog.org.site.pluginData.manage.self)) {
                continue;
            }

            items.push({
                id: site.publicId,
                slug: site.slug,
                name: site.name,
            });
        }

        return {
            page: items,
            isDone: page.isDone,
            continueCursor: page.continueCursor,
        };
    },
});

export const getByPublicId = query({
    args: {
        publicId: v.string(),
    },
    handler: async (ctx, args) => {
        const site = await ctx.db
            .query('sites')
            .withIndex('by_publicId', (q) => q.eq('publicId', args.publicId))
            .unique();

        if (!site) return null;

        const authorization = await resolveAuthorization(ctx, { siteId: site._id });
        if (!authorization?.application || authorization.application.type !== 'plugin') {
            return null;
        }

        if (!authorization.can(permissionCatalog.org.site.pluginData.manage.self)) {
            return null;
        }

        return {
            id: site.publicId,
            slug: site.slug,
            name: site.name,
        };
    },
});
