import type { ConvexHttpClient } from 'convex/browser';
import { internal } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { asPublic, getConvexClient } from '@/lib/convex-server';
import { verifyPluginToken } from '@/lib/plugin/jwt';

export class AuthError extends Error {
    constructor(
        message: string,
        public statusCode: number,
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

export type AuthenticatedPlugin = {
    _id: Id<'plugins'>;
    name: string;
    status: string;
    scopes?: Array<'push_data' | 'create_template'>;
};

/**
 * Authenticate a plugin request via Bearer JWT token.
 * Verifies JWT, fetches plugin, checks active status and tokenIssuedAt.
 */
export async function authenticatePlugin(request: Request): Promise<AuthenticatedPlugin> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new AuthError('Missing or invalid Authorization header', 401);
    }

    let token = authHeader.slice(7);
    if (token.startsWith('plugin:')) {
        token = token.slice(7);
    }

    let pluginId: string;
    let issuedAt: number;
    try {
        const claims = await verifyPluginToken(token);
        pluginId = claims.pluginId;
        issuedAt = claims.issuedAt;
    } catch {
        throw new AuthError('Invalid or expired token', 401);
    }

    const convex = getConvexClient();
    const plugin = await convex.query(asPublic(internal.plugins.registration.getById), {
        id: pluginId as Id<'plugins'>,
    });

    if (!plugin) {
        throw new AuthError('Plugin not found', 401);
    }

    if (plugin.status !== 'active') {
        throw new AuthError(`Plugin is not active (status: ${plugin.status})`, 403);
    }

    // Check token revocation via tokenIssuedAt
    if (plugin.tokenIssuedAt && issuedAt < plugin.tokenIssuedAt) {
        throw new AuthError('Token has been revoked', 401);
    }

    return {
        _id: plugin._id,
        name: plugin.name,
        status: plugin.status,
        scopes: plugin.scopes,
    };
}

/**
 * Check that the plugin has the required scope.
 * If no scopes are set on the plugin, all scopes are allowed.
 */
export function requireScope(plugin: AuthenticatedPlugin, scope: 'push_data' | 'create_template'): void {
    if (plugin.scopes && !plugin.scopes.includes(scope)) {
        throw new AuthError(`Plugin does not have '${scope}' scope`, 403);
    }
}

/**
 * Check that a plugin has access to the specified site.
 * Requires: plugin active + enabledByAdmin + enabledByOrg.
 */
export async function requireSiteAccess(
    convex: ConvexHttpClient,
    pluginId: Id<'plugins'>,
    siteSlug: string,
): Promise<void> {
    const hasAccess = await convex.query(asPublic(internal.plugins.siteAccess.checkAccess), {
        pluginId,
        siteSlug,
    });

    if (!hasAccess) {
        throw new AuthError('Plugin does not have access to this site', 403);
    }
}
