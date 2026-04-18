import { internal } from '../_generated/api';
import { httpAction } from '../_generated/server';
import { getRequiredEnv } from '../lib/env';
import { verifyAndParse } from './utils';

export const handleOrgMemberDeleted = httpAction(async (ctx, request) => {
    try {
        const event = await verifyAndParse(request, ctx, getRequiredEnv('WORKOS_WEBHOOK_ORG_MEM_DELETED_SECRET'));
        const { data } = event;

        const result = await ctx.runMutation(internal.actors.deleteOrgMemberFromWebhook, {
            userExternalId: data.user_id,
            organizationExternalId: data.organization_id,
        });

        if (!result.synced) {
            console.warn('Organization membership deleted webhook skipped:', result.reason);
        }

        return new Response(null, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return new Response('Unauthorized', { status: 401 });
        }
        console.error('Organization membership webhook processing error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
