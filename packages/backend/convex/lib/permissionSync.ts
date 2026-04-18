import type { Doc } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import {
    deletePermissionGrantsForSourceTarget,
    deletePermissionGrantsForSubjectSource,
    listActorPermissionGrantRows,
    normalizePermissionGrantRows,
    replacePermissionGrantsForSourceTarget,
} from './permissionGrants';
import {
    getActorRoleDefaultPermissions,
    getActorRoleMaxPermissions,
    getServiceAccountDefaultPermissions,
    getSiteActorDefaultPermissions,
    getSiteActorMaxPermissions,
    hasPermission,
    normalizeApplicationPermissions,
    type Permission,
} from './permissions';

function assertPermissionsWithinMax(permissions: readonly Permission[], maxPermissions: readonly Permission[]) {
    for (const permission of permissions) {
        if (!hasPermission(maxPermissions, permission)) {
            throw new Error(`Permission '${permission}' exceeds the allowed maximum`);
        }
    }
}

export async function syncActorRolePermissionGrants(ctx: MutationCtx, actor: Doc<'actors'>) {
    const subject = { subjectType: 'actor' as const, subjectId: actor._id };
    await deletePermissionGrantsForSubjectSource(ctx, subject, 'actorRole');

    const permissions = getActorRoleDefaultPermissions(actor.role, actor.type);
    if (permissions.length === 0) return;

    const target =
        actor.role === 'appAdmin'
            ? { targetType: 'platform' as const, targetId: null }
            : actor.organizationId
              ? { targetType: 'organization' as const, targetId: actor.organizationId }
              : null;

    if (!target) return;

    await replacePermissionGrantsForSourceTarget(ctx, subject, 'actorRole', target, permissions);
}

async function getApplicationByActorId(ctx: MutationCtx, actorId: Doc<'actors'>['_id']) {
    return ctx.db
        .query('applications')
        .withIndex('by_actor', (q) => q.eq('actorId', actorId))
        .unique();
}

export async function syncSiteActorPermissionGrants(ctx: MutationCtx, siteActor: Doc<'siteActors'>) {
    const actor = await ctx.db.get(siteActor.actorId);
    if (!actor) throw new Error('Actor not found');

    let permissions: Permission[] = [];

    if (actor.type === 'user') {
        if (!siteActor.role) throw new Error('Human site actors require a role');
        permissions = getSiteActorDefaultPermissions(siteActor.role);
    } else {
        const application = await getApplicationByActorId(ctx, actor._id);
        if (!application) throw new Error('Application not found for service account');

        const rows = await listActorPermissionGrantRows(ctx, actor._id);
        permissions = normalizePermissionGrantRows(rows).filter((permission) => permission.startsWith('org.site.'));
    }

    await replacePermissionGrantsForSourceTarget(
        ctx,
        { subjectType: 'actor', subjectId: siteActor.actorId },
        'siteActor',
        { targetType: 'site', targetId: siteActor.siteId },
        permissions,
    );
}

export async function removeSiteActorPermissionGrants(ctx: MutationCtx, siteActor: Doc<'siteActors'>) {
    await deletePermissionGrantsForSourceTarget(
        ctx,
        { subjectType: 'actor', subjectId: siteActor.actorId },
        'siteActor',
        {
            targetType: 'site',
            targetId: siteActor.siteId,
        },
    );
}

export async function syncApplicationPermissionGrants(
    ctx: MutationCtx,
    application: Pick<Doc<'applications'>, '_id' | 'actorId' | 'organizationId' | 'type'>,
    grantedPermissions?: readonly (string | number | bigint | boolean)[],
) {
    const permissions =
        grantedPermissions === undefined
            ? getServiceAccountDefaultPermissions(application.type)
            : normalizeApplicationPermissions(grantedPermissions);

    await deletePermissionGrantsForSourceTarget(
        ctx,
        { subjectType: 'actor', subjectId: application.actorId },
        'application',
        {
            targetType: 'platform',
            targetId: null,
        },
    );

    if (application.organizationId) {
        await deletePermissionGrantsForSourceTarget(
            ctx,
            { subjectType: 'actor', subjectId: application.actorId },
            'application',
            {
                targetType: 'organization',
                targetId: application.organizationId,
            },
        );
    }

    const platformPermissions = permissions.filter((permission) => permission.startsWith('platform.'));
    const organizationPermissions = permissions.filter((permission) => !permission.startsWith('platform.'));

    if (platformPermissions.length > 0) {
        await replacePermissionGrantsForSourceTarget(
            ctx,
            { subjectType: 'actor', subjectId: application.actorId },
            'application',
            {
                targetType: 'platform',
                targetId: null,
            },
            platformPermissions,
        );
    }

    if (application.organizationId && organizationPermissions.length > 0) {
        await replacePermissionGrantsForSourceTarget(
            ctx,
            { subjectType: 'actor', subjectId: application.actorId },
            'application',
            {
                targetType: 'organization',
                targetId: application.organizationId,
            },
            organizationPermissions,
        );
    }
}

export function assertPermissionsWithinActorRoleMax(actor: Doc<'actors'>, permissions: readonly Permission[]) {
    const maxPermissions = getActorRoleMaxPermissions(actor.role, actor.type);
    assertPermissionsWithinMax(permissions, maxPermissions);
}

export function assertPermissionsWithinSiteActorMax(
    role: NonNullable<Doc<'siteActors'>['role']>,
    permissions: readonly Permission[],
) {
    const maxPermissions = getSiteActorMaxPermissions(role);
    assertPermissionsWithinMax(permissions, maxPermissions);
}
