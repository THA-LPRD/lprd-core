'use node';

import { WorkOS } from '@workos-inc/node';
import { v } from 'convex/values';
import { internalAction } from '../_generated/server';

/**
 * Internal action to verify WorkOS webhook signature
 */
export const verifyWebhook = internalAction({
    args: {
        payload: v.string(),
        signature: v.string(),
        secret: v.string(),
    },
    returns: v.null(),
    handler: async (_ctx, args) => {
        const workos = new WorkOS(process.env.WORKOS_API_KEY);

        // Throws on an invalid signature. The parsed event contains Dates, which
        // Convex cannot return, so callers parse the verified payload themselves.
        await workos.webhooks.constructEvent({
            payload: args.payload,
            sigHeader: args.signature,
            secret: args.secret,
        });
        return null;
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
