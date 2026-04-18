import { httpRouter } from 'convex/server';
import { getRequiredEnv } from './lib/env';
import * as workos from './workos';

const http = httpRouter();

const usersPathSecret = getRequiredEnv('WORKOS_WEBHOOK_USERS_PATH_SECRET');
const orgsPathSecret = getRequiredEnv('WORKOS_WEBHOOK_ORGS_PATH_SECRET');
const orgMemberPathSecret = getRequiredEnv('WORKOS_WEBHOOK_ORG_MEM_PATH_SECRET');

http.route({
    path: `/api/v2/user/webhook/create-${usersPathSecret}`,
    method: 'POST',
    handler: workos.handleUserCreated,
});

http.route({
    path: `/api/v2/user/webhook/updated-${usersPathSecret}`,
    method: 'POST',
    handler: workos.handleUserUpdated,
});

http.route({
    path: `/api/v2/user/webhook/deleted-${usersPathSecret}`,
    method: 'POST',
    handler: workos.handleUserDeleted,
});

http.route({
    path: `/api/v2/org/webhook/created-${orgsPathSecret}`,
    method: 'POST',
    handler: workos.handleOrgCreated,
});

http.route({
    path: `/api/v2/org/webhook/updated-${orgsPathSecret}`,
    method: 'POST',
    handler: workos.handleOrgUpdated,
});

http.route({
    path: `/api/v2/org/webhook/deleted-${orgsPathSecret}`,
    method: 'POST',
    handler: workos.handleOrgDeleted,
});

http.route({
    path: `/api/v2/org-member/webhook/created-${orgMemberPathSecret}`,
    method: 'POST',
    handler: workos.handleOrgMemberCreated,
});

http.route({
    path: `/api/v2/org-member/webhook/updated-${orgMemberPathSecret}`,
    method: 'POST',
    handler: workos.handleOrgMemberUpdated,
});

http.route({
    path: `/api/v2/org-member/webhook/deleted-${orgMemberPathSecret}`,
    method: 'POST',
    handler: workos.handleOrgMemberDeleted,
});

export default http;
