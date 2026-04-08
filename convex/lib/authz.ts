import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { type ActionCtx, internalQuery, type MutationCtx, type QueryCtx } from '../_generated/server';
import { getCurrentActor, getSiteActor } from '../actors';
import { buildPermissionState, type Permission } from './permissions';
import { getApplicablePermissionGrants, listActorPermissionGrantRows } from './permissionGrants';

type Ctx = QueryCtx | MutationCtx;
type AuthorizationOptions = { siteId?: Id<'sites'>; organizationId?: Id<'organizations'> };

type BaseAuthorization = ReturnType<typeof buildPermissionState>;

export type AuthorizationPayload = {
    actor: Doc<'actors'>;
    grantedPermissions: Permission[];
    application: Doc<'applications'> | null;
    organizationId: Id<'organizations'> | null;
    site: Doc<'sites'> | null;
    siteId: Id<'sites'> | null;
    siteActor: Doc<'siteActors'> | null;
};

export type Authorization = BaseAuthorization & {
    actor: Doc<'actors'>;
    siteActor: Doc<'siteActors'> | null;
    application: Doc<'applications'> | null;
    organizationId: Id<'organizations'> | null;
    site: Doc<'sites'> | null;
    siteId: Id<'sites'> | null;
};

async function getApplicationByActorId(ctx: Ctx, actorId: Id<'actors'>) {
    return ctx.db
        .query('applications')
        .withIndex('by_actor', (q) => q.eq('actorId', actorId))
        .unique();
}

function createAuthorizationPayload({
    actor,
    application,
    site,
    siteActor,
    organizationId,
    rows,
}: {
    actor: Doc<'actors'>;
    application: Doc<'applications'> | null;
    site: Doc<'sites'> | null;
    siteActor: Doc<'siteActors'> | null;
    organizationId: Id<'organizations'> | null;
    rows: Doc<'permissionGrants'>[];
}): AuthorizationPayload {
    const effectiveRows =
        application?.type === 'plugin' && site
            ? rows.filter(
                  (row) =>
                      !(
                          row.source === 'application' &&
                          row.targetType === 'organization' &&
                          row.permission.startsWith('org.site.')
                      ),
              )
            : rows;
    const grantedPermissions = getApplicablePermissionGrants(effectiveRows, {
        organizationId,
        siteId: site?._id ?? null,
    });

    return {
        actor,
        grantedPermissions,
        application,
        organizationId,
        site,
        siteId: site?._id ?? null,
        siteActor,
    };
}

export function buildAuthorization(payload: AuthorizationPayload): Authorization {
    const base = buildPermissionState(payload.grantedPermissions);

    return {
        ...base,
        actor: payload.actor,
        siteActor: payload.siteActor,
        grantedPermissions: payload.grantedPermissions,
        application: payload.application,
        organizationId: payload.organizationId,
        site: payload.site,
        siteId: payload.siteId,
    };
}

async function resolveAuthorizationPayload(
    ctx: Ctx,
    options: AuthorizationOptions = {},
): Promise<AuthorizationPayload | null> {
    const actor = await getCurrentActor(ctx);
    if (!actor) return null;

    const application = actor.type === 'serviceAccount' ? await getApplicationByActorId(ctx, actor._id) : null;
    const site = options.siteId ? await ctx.db.get(options.siteId) : null;
    const siteActor = site ? await getSiteActor(ctx, actor._id, site._id) : null;
    const organizationId =
        site?.organizationId ?? options.organizationId ?? application?.organizationId ?? actor.organizationId ?? null;
    const rows = await listActorPermissionGrantRows(ctx, actor._id);

    return createAuthorizationPayload({
        actor,
        application,
        site,
        siteActor,
        organizationId,
        rows,
    });
}

// ---------------------------------------------------------------------------
// Query / Mutation interface
// ---------------------------------------------------------------------------

export async function resolveAuthorization(
    ctx: Ctx,
    options: AuthorizationOptions = {},
): Promise<Authorization | null> {
    const payload = await resolveAuthorizationPayload(ctx, options);
    return payload ? buildAuthorization(payload) : null;
}

export async function requireAuthorization(ctx: Ctx, options: AuthorizationOptions = {}): Promise<Authorization> {
    const authorization = await resolveAuthorization(ctx, options);
    if (!authorization) throw new Error('Not authenticated');
    if (authorization.actor.status !== 'active') throw new Error('Forbidden');
    if (authorization.application && authorization.application.status !== 'active') throw new Error('Forbidden');
    return authorization;
}

export async function requireSiteAuthorization(
    ctx: Ctx,
    siteId: Id<'sites'>,
): Promise<Authorization & { site: Doc<'sites'>; siteId: Id<'sites'> }> {
    const authorization = await requireAuthorization(ctx, { siteId });
    if (!authorization.site) throw new Error('Site not found');

    return {
        ...authorization,
        site: authorization.site,
        siteId: authorization.siteId as Id<'sites'>,
    };
}

export async function requirePermission(
    ctx: Ctx,
    permission: Permission,
    options: AuthorizationOptions = {},
): Promise<Authorization> {
    const authorization = await requireAuthorization(ctx, options);
    if (!authorization.can(permission)) throw new Error('Forbidden');
    return authorization;
}

// ---------------------------------------------------------------------------
// Action interface
// ---------------------------------------------------------------------------

export const resolveInternal = internalQuery({
    args: {
        siteId: v.optional(v.id('sites')),
        organizationId: v.optional(v.id('organizations')),
    },
    handler: async (ctx, args) => resolveAuthorizationPayload(ctx, args),
});

export async function resolveAuthorizationFromAction(
    ctx: ActionCtx,
    options: AuthorizationOptions = {},
): Promise<Authorization | null> {
    const payload = await ctx.runQuery(internal.lib.authz.resolveInternal, options);
    return payload ? buildAuthorization(payload) : null;
}

export async function requireAuthorizationFromAction(
    ctx: ActionCtx,
    options: AuthorizationOptions = {},
): Promise<Authorization> {
    const authorization = await resolveAuthorizationFromAction(ctx, options);
    if (!authorization) throw new Error('Not authenticated');
    if (authorization.actor.status !== 'active') throw new Error('Forbidden');
    if (authorization.application && authorization.application.status !== 'active') throw new Error('Forbidden');
    return authorization;
}

export async function requirePermissionFromAction(
    ctx: ActionCtx,
    permission: Permission,
    options: AuthorizationOptions = {},
): Promise<Authorization> {
    const authorization = await requireAuthorizationFromAction(ctx, options);
    if (!authorization.can(permission)) throw new Error('Forbidden');
    return authorization;
}
