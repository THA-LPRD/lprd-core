import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { verifyAndParse } from './helpers';

/**
 * Webhook handler for user.deleted events
 */
export const handleUserDeleted = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, process.env.WORKOS_WEBHOOK_USERS_DELETED_SECRET!);
        const { data } = event;

        await ctx.runMutation(internal.actors.deleteFromWebhook, {
            workosUserId: data.id,
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
