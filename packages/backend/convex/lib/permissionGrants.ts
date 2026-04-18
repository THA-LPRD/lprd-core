import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
    isSubjectTypeAllowed,
    isTargetTypeAllowed,
    normalizeApplicationPermissions,
    type Permission,
    type PermissionGrantSource,
    type PermissionGrantSubjectId,
    type PermissionGrantSubjectType,
    type PermissionGrantTargetId,
    type PermissionGrantTargetType,
} from './permissions';

type Ctx = QueryCtx | MutationCtx;

type GrantSubject = {
    subjectType: PermissionGrantSubjectType;
    subjectId: PermissionGrantSubjectId;
};

type GrantTarget = {
    targetType: PermissionGrantTargetType;
    targetId: PermissionGrantTargetId;
};

export async function listActorPermissionGrantRows(ctx: Ctx, actorId: Id<'actors'>) {
    return ctx.db
        .query('permissionGrants')
        .withIndex('by_subject', (q) => q.eq('subjectType', 'actor').eq('subjectId', actorId))
        .collect();
}

export async function listPermissionGrantRowsForSubject(ctx: Ctx, subject: GrantSubject) {
    return ctx.db
        .query('permissionGrants')
        .withIndex('by_subject', (q) => q.eq('subjectType', subject.subjectType).eq('subjectId', subject.subjectId))
        .collect();
}

export function normalizePermissionGrantRows(rows: readonly Doc<'permissionGrants'>[]): Permission[] {
    return normalizeApplicationPermissions(rows.map((row) => row.permission));
}

export function getApplicablePermissionGrants(
    rows: readonly Doc<'permissionGrants'>[],
    target: {
        organizationId?: Id<'organizations'> | null;
        siteId?: Id<'sites'> | null;
    },
): Permission[] {
    const applicable = rows.filter((row) => {
        if (row.targetType === 'platform') return true;
        if (row.targetType === 'organization')
            return target.organizationId !== null && target.organizationId === row.targetId;
        return target.siteId !== null && target.siteId === row.targetId;
    });

    return normalizePermissionGrantRows(applicable);
}

function assertPermissionsAllowedForTarget(
    permissions: readonly Permission[],
    subjectType: PermissionGrantSubjectType,
    targetType: PermissionGrantTargetType,
    targetId: PermissionGrantTargetId,
) {
    if (targetType === 'platform' && targetId !== null) {
        throw new Error('Platform grants cannot have a target id');
    }

    if (targetType !== 'platform' && targetId === null) {
        throw new Error('Non-platform grants require a target id');
    }

    for (const permission of permissions) {
        if (!isSubjectTypeAllowed(permission, subjectType)) {
            throw new Error(`Permission '${permission}' cannot be granted from '${subjectType}'`);
        }
        if (!isTargetTypeAllowed(permission, targetType)) {
            throw new Error(`Permission '${permission}' cannot target '${targetType}'`);
        }
    }
}

export async function replacePermissionGrantsForSourceTarget(
    ctx: MutationCtx,
    subject: GrantSubject,
    source: PermissionGrantSource,
    target: GrantTarget,
    permissions: readonly Permission[],
) {
    assertPermissionsAllowedForTarget(permissions, subject.subjectType, target.targetType, target.targetId);

    const existing = await listPermissionGrantRowsForSubject(ctx, subject);

    for (const grant of existing) {
        if (grant.source === source && grant.targetType === target.targetType && grant.targetId === target.targetId) {
            await ctx.db.delete(grant._id);
        }
    }

    const now = Date.now();

    for (const permission of normalizeApplicationPermissions(permissions)) {
        await ctx.db.insert('permissionGrants', {
            subjectType: subject.subjectType,
            subjectId: subject.subjectId,
            permission,
            targetType: target.targetType,
            targetId: target.targetId,
            source,
            createdAt: now,
            updatedAt: now,
        });
    }
}

export async function deletePermissionGrantsForSourceTarget(
    ctx: MutationCtx,
    subject: GrantSubject,
    source: PermissionGrantSource,
    target: GrantTarget,
) {
    const existing = await listPermissionGrantRowsForSubject(ctx, subject);

    for (const grant of existing) {
        if (grant.source === source && grant.targetType === target.targetType && grant.targetId === target.targetId) {
            await ctx.db.delete(grant._id);
        }
    }
}

export async function deletePermissionGrantsForSubjectSource(
    ctx: MutationCtx,
    subject: GrantSubject,
    source: PermissionGrantSource,
) {
    const existing = await listPermissionGrantRowsForSubject(ctx, subject);

    for (const grant of existing) {
        if (grant.source === source) {
            await ctx.db.delete(grant._id);
        }
    }
}

export async function deletePermissionGrantsForActor(ctx: MutationCtx, actorId: Id<'actors'>) {
    const bySubject = await listPermissionGrantRowsForSubject(ctx, { subjectType: 'actor', subjectId: actorId });
    const byTarget = await ctx.db
        .query('permissionGrants')
        .withIndex('by_target', (q) => q.eq('targetType', 'actor').eq('targetId', actorId))
        .collect();
    const existing = [
        ...bySubject,
        ...byTarget.filter((row) => !bySubject.some((subjectRow) => subjectRow._id === row._id)),
    ];

    for (const grant of existing) {
        await ctx.db.delete(grant._id);
    }
}

export async function deletePermissionGrantsForTarget(ctx: MutationCtx, target: GrantTarget) {
    const existing = await ctx.db
        .query('permissionGrants')
        .withIndex('by_target', (q) => q.eq('targetType', target.targetType).eq('targetId', target.targetId))
        .collect();

    for (const grant of existing) {
        await ctx.db.delete(grant._id);
    }
}

export async function hasSubjectPermissionGrantOnTarget(
    ctx: Ctx,
    subject: GrantSubject,
    permission: Permission,
    target: GrantTarget,
) {
    const rows = await listPermissionGrantRowsForSubject(ctx, subject);
    return rows.some(
        (row) =>
            row.permission === permission && row.targetType === target.targetType && row.targetId === target.targetId,
    );
}
