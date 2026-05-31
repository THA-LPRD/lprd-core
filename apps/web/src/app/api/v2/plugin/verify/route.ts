import { NextResponse } from 'next/server';
import { AuthError } from '@shared/auth-errors';
import { requireAuthorization } from '@/lib/authz';

/**
 * GET /api/v2/plugin/verify
 * Plugins can call this to check if their token is valid and they are active.
 * Returns plugin info on success, 401/403 on failure.
 */
export async function GET(request: Request) {
    try {
        const authorization = await requireAuthorization({ request });
        if (!authorization.application) {
            throw new AuthError('Application not found', 401);
        }
        if (authorization.application.type !== 'plugin') {
            throw new AuthError(`Application type '${authorization.application.type}' is not allowed here`, 403);
        }

        return NextResponse.json({
            plugin_id: authorization.application._id,
            name: authorization.application.name,
            status: authorization.application.status,
            permissions: authorization.grantedPermissions,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
