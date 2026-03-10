import { httpRouter } from 'convex/server';
import { handleUserCreated } from './workos/userCreated';
import { handleUserUpdated } from './workos/userUpdated';
import { handleUserDeleted } from './workos/userDeleted';

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

export default http;
