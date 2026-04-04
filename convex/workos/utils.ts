import { createAvatar } from '@dicebear/core';
import { glass } from '@dicebear/collection';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { ActionCtx } from '../_generated/server';

export async function verifyAndParse(request: Request, ctx: ActionCtx, secretEnvVar: string) {
    const bodyText = await request.text();
    const sigHeader = String(request.headers.get('workos-signature'));

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

export async function storeAvatar(ctx: ActionCtx, email: string, profilePictureUrl?: string): Promise<Id<'_storage'>> {
    if (profilePictureUrl) {
        try {
            const response = await fetch(profilePictureUrl);
            if (response.ok) {
                const blob = await response.blob();
                return await ctx.storage.store(blob);
            }
        } catch (error) {
            console.error('Failed to fetch WorkOS avatar:', error);
        }
    }

    const avatar = createAvatar(glass, { seed: email });
    const svg = avatar.toString();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return await ctx.storage.store(blob);
}
