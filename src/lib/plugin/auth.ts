import { internal } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { convexAdmin } from '@/lib/convex-admin';
import { verifyToken } from '@/lib/workos/connect';

export class AuthError extends Error {
    constructor(
        message: string,
        public statusCode: number,
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

export type AuthenticatedApplication = {
    _id: Id<'applications'>;
    actorId: Id<'actors'>;
    type: 'plugin' | 'internal';
    name: string;
    status: string;
    workosOrganizationId: string;
    scopes?: Array<'push_data' | 'create_template' | 'internal_render'>;
};

/**
 * Authenticate a service account request.
 * Verifies the M2M Bearer token directly from the Authorization header,
 * then looks up the application in Convex and enforces status/type checks.
 */
export async function authenticateApplication(
    request: Request,
    expectedType?: AuthenticatedApplication['type'],
): Promise<AuthenticatedApplication> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new AuthError('Missing or invalid Authorization header', 401);
    }

    let clientId: string | undefined;
    let orgId: string | undefined;
    try {
        const { payload } = await verifyToken(authHeader.slice(7));
        clientId =
            payload.sub ??
            (typeof payload.aud === 'string' ? payload.aud : Array.isArray(payload.aud) ? payload.aud[0] : undefined);
        orgId = payload.org_id;
    } catch {
        throw new AuthError('Invalid or expired token', 401);
    }

    if (!clientId) {
        throw new AuthError('Token missing client identifier', 401);
    }

    const result = await convexAdmin.query(internal.plugins.applications.getByWorkosClientId, {
        workosClientId: clientId,
    });

    if (!result?.application || !result.actor) {
        throw new AuthError('Application not found', 401);
    }

    if (result.actor.status !== 'active') {
        throw new AuthError('Actor is inactive', 403);
    }

    if (result.application.status !== 'active') {
        throw new AuthError(`Application is not active (status: ${result.application.status})`, 403);
    }

    if (expectedType && result.application.type !== expectedType) {
        throw new AuthError(`Application type '${result.application.type}' is not allowed here`, 403);
    }

    if (orgId && result.application.workosOrganizationId !== orgId) {
        throw new AuthError('Application organization does not match token organization', 403);
    }

    return {
        _id: result.application._id,
        actorId: result.application.actorId,
        type: result.application.type,
        name: result.application.name,
        status: result.application.status,
        workosOrganizationId: result.application.workosOrganizationId,
        scopes: result.application.scopes,
    };
}

export async function authenticatePlugin(request: Request) {
    return authenticateApplication(request, 'plugin');
}

export function requireScope(
    application: AuthenticatedApplication,
    scope: 'push_data' | 'create_template' | 'internal_render',
): void {
    if (application.scopes && !application.scopes.includes(scope)) {
        throw new AuthError(`Application does not have '${scope}' scope`, 403);
    }
}

export async function requireSiteAccess(pluginId: Id<'applications'>, siteSlug: string): Promise<void> {
    const hasAccess = await convexAdmin.query(internal.plugins.siteAccess.checkAccess, {
        pluginId,
        siteSlug,
    });

    if (!hasAccess) {
        throw new AuthError('Application does not have access to this site', 403);
    }
}
