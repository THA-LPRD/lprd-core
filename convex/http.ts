import {httpRouter} from 'convex/server';
import {handleUserCreated, handleUserDeleted, handleUserUpdated} from './workos';

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

export default http;