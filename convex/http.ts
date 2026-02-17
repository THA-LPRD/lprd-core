import { httpRouter } from 'convex/server';
import { handleUserCreated } from './workos/userCreated';
import { handleUserUpdated } from './workos/userUpdated';
import { handleUserDeleted } from './workos/userDeleted';
import { handlePluginRegister } from './plugins/registration';
import { handleCreateTemplate } from './plugins/createTemplate';

const http = httpRouter();

const usersPathSecret = process.env.WORKOS_WEBHOOK_USERS_PATH_SECRET!;

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

// Plugin API
http.route({
    path: '/api/v2/plugin/register',
    method: 'POST',
    handler: handlePluginRegister,
});

http.route({
    path: '/api/v2/plugin/webhook/createTemplate',
    method: 'POST',
    handler: handleCreateTemplate,
});

// Plugin data webhook moved to Next.js API route: /api/v2/plugin/webhook/data

export default http;
