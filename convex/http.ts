import {httpRouter} from 'convex/server';
import {handleUserCreated} from './workos/userCreated';
import {handleUserUpdated} from './workos/userUpdated';
import {handleUserDeleted} from './workos/userDeleted';
import {handlePluginRegister} from './plugin/register';
import {handlePluginWebhook} from './plugin/webhook';

const http = httpRouter();

const usersPathSecret = process.env.WORKOS_WEBHOOK_USERS_PATH_SECRET!;

http.route({
	path: `/webhooks/workos/users-${usersPathSecret}/create`,
	method: 'POST',
	handler: handleUserCreated,
});

http.route({
	path: `/webhooks/workos/users-${usersPathSecret}/update`,
	method: 'POST',
	handler: handleUserUpdated,
});

http.route({
	path: `/webhooks/workos/users-${usersPathSecret}/deleted`,
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
	pathPrefix: '/api/v2/plugin/webhook/',
	method: 'POST',
	handler: handlePluginWebhook,
});

export default http;