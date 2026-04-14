import { internal } from '../_generated/api';
import { httpAction } from '../_generated/server';
import { getRequiredEnv } from '../lib/env';
import { verifyAndParse } from './utils';

/**
 * Webhook handler for org.created events
 */
export const handleOrgCreated = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, getRequiredEnv('WORKOS_WEBHOOK_ORGS_CREATED_SECRET'));
        const { data } = event;

        const convexId = typeof data.external_id === 'string' ? data.external_id : undefined;

        const organizationId: string = await ctx.runMutation(internal.organizations.upsertFromWebhook, {
            externalId: data.id,
            name: data.name,
        });

        if (convexId !== organizationId) {
            await ctx.runAction(internal.workos.helpers.syncOrganizationExternalId, {
                organization: data.id,
                externalId: organizationId,
            });
        }

        return new Response(null, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return new Response('Unauthorized', { status: 401 });
        }
        console.error('Org webhook processing error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
