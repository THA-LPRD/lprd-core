import { WorkOS } from '@workos-inc/node';
import type { ActionCtx } from '../_generated/server';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { createAvatar } from '@dicebear/core';
import { glass } from '@dicebear/collection';
import type { Id } from '../_generated/dataModel';

/**
 * Helper function to verify webhook signature and parse payload
 */
export async function verifyAndParse(request: Request, ctx: ActionCtx, secretEnvVar: string) {
    const bodyText = await request.text();
    const sigHeader = String(request.headers.get('workos-signature'));

    // Verify signature with event-specific secret
    try {
        await ctx.runAction(internal.workos.helpers.verifyWebhook, {
            payload: bodyText,
            signature: sigHeader,
            secret: secretEnvVar,
        });
    } catch {
        throw new Error('Unauthorized');
    }

    return JSON.parse(bodyText);
}

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

/**
 * Generate or fetch avatar and store in Convex storage
 */
export async function storeAvatar(ctx: ActionCtx, email: string, profilePictureUrl?: string): Promise<Id<'_storage'>> {
    // Try to fetch WorkOS avatar if provided
    if (profilePictureUrl) {
        try {
            const response = await fetch(profilePictureUrl);
            if (response.ok) {
                const blob = await response.blob();
                return await ctx.storage.store(blob);
            }
        } catch (error) {
            console.error('Failed to fetch WorkOS avatar:', error);
            // Fall through to generate DiceBear avatar
        }
    }

    // Generate DiceBear avatar using email as seed
    const avatar = createAvatar(glass, { seed: email });
    const svg = avatar.toString();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return await ctx.storage.store(blob);
}
