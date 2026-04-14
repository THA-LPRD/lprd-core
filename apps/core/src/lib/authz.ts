import { fetchQuery } from 'convex/nextjs';
import type { FunctionReturnType } from 'convex/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@shared/auth-errors';
import { buildPermissionState, type Permission } from '@/lib/permissions';
import { getBearerToken, requireVerifiedBearerToken } from '@shared/workos/connect';

type CurrentAuthorization = NonNullable<FunctionReturnType<typeof api.authorization.current>>;
type SiteAuthorization = NonNullable<FunctionReturnType<typeof api.authorization.forSite>>;

type BaseAuthorization = ReturnType<typeof buildPermissionState>;
type AuthorizationOptions = { request?: Request; siteId?: Id<'sites'>; redirectTo?: string };

export type Authorization = BaseAuthorization & {
    actor: CurrentAuthorization['actor'];
    application: CurrentAuthorization['application'];
    accessToken: string;
    siteActor: SiteAuthorization['siteActor'];
    siteId: Id<'sites'> | null;
};

function buildAuthorization(
    current: CurrentAuthorization,
    accessToken: string,
    siteAuthorization: SiteAuthorization | null = null,
    siteId: Id<'sites'> | null = null,
): Authorization {
    const authorization = buildPermissionState(siteAuthorization?.grantedPermissions ?? current.grantedPermissions);

    return {
        ...authorization,
        actor: siteAuthorization?.actor ?? current.actor,
        application: current.application,
        accessToken,
        siteActor: siteAuthorization?.siteActor ?? null,
        siteId,
    };
}

function assertAuthorizationActive(authorization: Authorization): Authorization {
    if (authorization.actor.status !== 'active') {
        throw new AuthError('Forbidden', 403);
    }

    if (authorization.application && authorization.application.status !== 'active') {
        throw new AuthError('Forbidden', 403);
    }

    return authorization;
}

async function resolveAccessToken(request?: Request): Promise<string | null> {
    const authHeader = request ? request.headers.get('authorization') : (await headers()).get('authorization');
    const bearerToken = getBearerToken(authHeader);

    if (bearerToken) {
        return requireVerifiedBearerToken(authHeader);
    }

    const auth = await withAuth();
    if (!auth.user || !auth.accessToken) {
        return null;
    }

    return auth.accessToken;
}

export async function resolveAuthorization(options: AuthorizationOptions = {}): Promise<Authorization | null> {
    const accessToken = await resolveAccessToken(options.request);
    if (!accessToken) return null;

    const current = await fetchQuery(api.authorization.current, {}, { token: accessToken });
    if (!current) return null;

    let siteAuthorization: SiteAuthorization | null = null;
    if (options.siteId) {
        siteAuthorization = await fetchQuery(
            api.authorization.forSite,
            { siteId: options.siteId },
            { token: accessToken },
        );
        if (!siteAuthorization || siteAuthorization.actor._id !== current.actor._id) {
            return null;
        }
    }

    return buildAuthorization(current, accessToken, siteAuthorization, options.siteId ?? null);
}

export async function requireAuthorization(options: AuthorizationOptions = {}): Promise<Authorization> {
    const authorization = await resolveAuthorization(options);
    if (!authorization) {
        if (options.redirectTo) {
            redirect(options.redirectTo);
        }
        throw new AuthError('Unauthorized', 401);
    }

    return assertAuthorizationActive(authorization);
}

export async function requireSiteAuthorization(
    siteId: Id<'sites'>,
    options: Omit<AuthorizationOptions, 'siteId'> = {},
): Promise<Authorization & { siteId: Id<'sites'> }> {
    const authorization = await requireAuthorization({ ...options, siteId });
    return {
        ...authorization,
        siteId,
    };
}

export async function requirePermission(
    permission: Permission,
    options: AuthorizationOptions = {},
): Promise<Authorization> {
    const authorization = await requireAuthorization(options);
    if (!authorization.can(permission)) {
        throw new AuthError('Forbidden', 403);
    }

    return authorization;
}
