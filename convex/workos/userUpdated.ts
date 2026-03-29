import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { storeAvatar, verifyAndParse } from './helpers';

/**
 * Webhook handler for user.updated events
 */
export const handleUserUpdated = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, process.env.WORKOS_WEBHOOK_USERS_UPDATED_SECRET!);
        const { data } = event;

        // If avatar URL changed, fetch and store new avatar
        let avatarStorageId;
        if (data.profile_picture_url !== undefined) {
            avatarStorageId = await storeAvatar(ctx, data.email, data.profile_picture_url);
        }

        await ctx.runMutation(internal.actors.updateFromWebhook, {
            workosUserId: data.id,
            email: data.email,
            name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
            avatarStorageId,
        });

        return new Response(null, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return new Response('Unauthorized', { status: 401 });
        }
        console.error('Webhook processing error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
