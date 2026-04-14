import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { httpAction } from '../_generated/server';
import { getRequiredEnv } from '../lib/env';
import { storeAvatar, verifyAndParse } from './utils';

/**
 * Webhook handler for user.updated events
 */
export const handleUserUpdated = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, getRequiredEnv('WORKOS_WEBHOOK_USERS_UPDATED_SECRET'));
        const { data } = event;

        // If avatar URL changed, fetch and store new avatar
        let avatarStorageId: Id<'_storage'> | undefined;
        if (data.profile_picture_url !== undefined) {
            avatarStorageId = await storeAvatar(ctx, data.email, data.profile_picture_url);
        }

        const convexId = typeof data.external_id === 'string' ? data.external_id : undefined;

        const actorId: string = await ctx.runMutation(internal.actors.upsertFromWebhook, {
            externalId: data.id,
            email: data.email,
            name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
            avatarStorageId,
        });

        if (convexId !== actorId) {
            await ctx.runAction(internal.workos.helpers.syncUserExternalId, {
                userId: data.id,
                externalId: actorId,
            });
        }

        return new Response(null, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return new Response('Unauthorized', { status: 401 });
        }
        console.error('Webhook processing error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
