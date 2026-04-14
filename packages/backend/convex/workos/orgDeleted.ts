import { internal } from '../_generated/api';
import { httpAction } from '../_generated/server';
import { getRequiredEnv } from '../lib/env';
import { verifyAndParse } from './utils';

/**
 * Webhook handler for org.deleted events
 */
export const handleOrgDeleted = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, getRequiredEnv('WORKOS_WEBHOOK_ORGS_DELETED_SECRET'));
        const { data } = event;

        await ctx.runMutation(internal.organizations.deleteFromWebhook, {
            externalId: data.id,
        });

        return new Response(null, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return new Response('Unauthorized', { status: 401 });
        }
        console.error('Org webhook processing error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
