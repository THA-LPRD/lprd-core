import { v } from 'convex/values';
import { query } from './_generated/server';
import { withAvatarUrl } from './actors';
import { resolveAuthorization } from './lib/authz';

export const current = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization) return null;

        return {
            actor: await withAvatarUrl(ctx, authorization.actor),
            application: authorization.application,
            grantedPermissions: authorization.grantedPermissions,
        };
    },
});

export const forSite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization) return null;

        return {
            actor: await withAvatarUrl(ctx, authorization.actor),
            siteActor: authorization.siteActor,
            grantedPermissions: authorization.grantedPermissions,
        };
    },
});
