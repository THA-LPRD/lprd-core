'use node';

import { WorkOS } from '@workos-inc/node';
import { internalAction } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Internal action to verify WorkOS webhook signature
 */
export const verifyWebhook = internalAction({
    args: {
        payload: v.string(),
        signature: v.string(),
        secret: v.string(),
    },
    handler: async (ctx, args) => {
        const workos = new WorkOS(process.env.WORKOS_API_KEY);

        return workos.webhooks.constructEvent({
            payload: JSON.parse(args.payload),
            sigHeader: args.signature,
            secret: args.secret,
        });
    },
});

export const syncUserExternalId = internalAction({
    args: {
        userId: v.string(),
        externalId: v.string(),
    },
    handler: async (_ctx, args) => {
        const workos = new WorkOS(process.env.WORKOS_API_KEY);
        await workos.userManagement.updateUser({
            userId: args.userId,
            externalId: args.externalId,
        });
    },
});

export const syncOrganizationExternalId = internalAction({
    args: {
        organization: v.string(),
        externalId: v.string(),
    },
    handler: async (_ctx, args) => {
        const workos = new WorkOS(process.env.WORKOS_API_KEY);
        await workos.organizations.updateOrganization({
            organization: args.organization,
            externalId: args.externalId,
        });
    },
});
