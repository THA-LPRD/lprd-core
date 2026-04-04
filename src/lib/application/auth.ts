import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import type { ApplicationType } from '@/lib/applications';
import { isPluginApplication } from '@/lib/applications';
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
    type: ApplicationType;
    name: string;
    status: string;
    organizationId?: Id<'organizations'>;
    scopes?: Array<'push_data' | 'create_template' | 'internal_render'>;
};

/**
 * Authenticate a service account request.
 * Verifies the M2M Bearer token directly from the Authorization header,
 * then resolves the application via Convex (which independently verifies the token).
 */
export async function authenticateApplication(
    request: Request,
    expectedType?: AuthenticatedApplication['type'],
): Promise<AuthenticatedApplication> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new AuthError('Missing or invalid Authorization header', 401);
    }

    const token = authHeader.slice(7);

    // Next.js independently verifies the JWT
    try {
        await verifyToken(token);
    } catch {
        throw new AuthError('Invalid or expired token', 401);
    }

    // Convex independently verifies the caller via getCurrentActor
    const result = await fetchQuery(api.applications.crud.resolveMyApplication, { expectedType }, { token });

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

    return {
        _id: result.application._id,
        actorId: result.application.actorId,
        type: result.application.type,
        name: result.application.name,
        status: result.application.status,
        organizationId: result.application.organizationId,
        scopes: result.application.scopes,
    };
}

export async function authenticatePlugin(request: Request) {
    const application = await authenticateApplication(request, 'plugin');

    if (!isPluginApplication(application)) {
        throw new AuthError(`Application type '${application.type}' is not allowed here`, 403);
    }

    return application;
}

export function requireScope(
    application: AuthenticatedApplication,
    scope: 'push_data' | 'create_template' | 'internal_render',
): void {
    if (!application.scopes || !application.scopes.includes(scope)) {
        throw new AuthError(`Application does not have '${scope}' scope`, 403);
    }
}

export async function requireSiteAccess(token: string, siteSlug: string): Promise<void> {
    const hasAccess = await fetchQuery(api.applications.plugin.siteAccess.checkMyAccess, { siteSlug }, { token });

    if (!hasAccess) {
        throw new AuthError('Application does not have access to this site', 403);
    }
}
