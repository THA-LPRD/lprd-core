import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { verifyAndParse } from './helpers';

/**
 * Webhook handler for org.updated events
 */
export const handleOrgUpdated = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, process.env.WORKOS_WEBHOOK_ORGS_UPDATED_SECRET!);
        const { data } = event;

        if (typeof data.external_id !== 'string') {
            console.error('Org webhook processing error: WorkOS organization is missing external_id');
            return new Response('WorkOS organization is missing external_id', { status: 400 });
        }

        const organizationId: string = await ctx.runMutation(internal.organizations.upsertFromWebhook, {
            externalId: data.external_id,
            name: data.name,
        });

        if (data.external_id !== organizationId) {
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
