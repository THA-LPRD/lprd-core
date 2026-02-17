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

        await ctx.runMutation(internal.users.createFromWebhook, {
            authId: data.id,
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
