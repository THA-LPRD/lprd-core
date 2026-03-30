import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { storeAvatar, verifyAndParse } from './helpers';

/**
 * Webhook handler for user.created events
 */
export const handleUserCreated = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, process.env.WORKOS_WEBHOOK_USERS_CREATED_SECRET!);
        const { data } = event;

        // Generate or fetch avatar and store in Convex
        const avatarStorageId = await storeAvatar(ctx, data.email, data.profile_picture_url);

        if (typeof data.external_id !== 'string') {
            console.error('Webhook processing error: WorkOS user is missing external_id');
            return new Response('WorkOS user is missing external_id', { status: 400 });
        }

        const actorId: string = await ctx.runMutation(internal.actors.createFromWebhook, {
            externalId: data.external_id,
            email: data.email,
            name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
            avatarStorageId,
        });

        if (data.external_id !== actorId) {
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
