import { httpRouter } from 'convex/server';
import { handleUserCreated } from './workos/userCreated';
import { handleUserUpdated } from './workos/userUpdated';
import { handleUserDeleted } from './workos/userDeleted';
import { handleOrgCreated } from './workos/orgCreated';
import { handleOrgUpdated } from './workos/orgUpdated';
import { handleOrgDeleted } from './workos/orgDeleted';

const http = httpRouter();

const usersPathSecret = process.env.WORKOS_WEBHOOK_USERS_PATH_SECRET!;
const orgsPathSecret = process.env.WORKOS_WEBHOOK_ORGS_PATH_SECRET!;

http.route({
    path: `/api/v2/user/webhook/create-${usersPathSecret}`,
    method: 'POST',
    handler: handleUserCreated,
});

http.route({
    path: `/api/v2/user/webhook/update-${usersPathSecret}`,
    method: 'POST',
    handler: handleUserUpdated,
});

http.route({
    path: `/api/v2/user/webhook/deleted-${usersPathSecret}`,
    method: 'POST',
    handler: handleUserDeleted,
});

http.route({
    path: `/api/v2/org/webhook/created-${orgsPathSecret}`,
    method: 'POST',
    handler: handleOrgCreated,
});

http.route({
    path: `/api/v2/org/webhook/updated-${orgsPathSecret}`,
    method: 'POST',
    handler: handleOrgUpdated,
});

http.route({
    path: `/api/v2/org/webhook/deleted-${orgsPathSecret}`,
    method: 'POST',
    handler: handleOrgDeleted,
});

export default http;
