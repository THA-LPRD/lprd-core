import type { Id } from '../../_generated/dataModel';
import type { Permission } from './catalog';

export const permissionGrantTargetTypes = ['actor', 'platform', 'organization', 'site'] as const;
export const permissionGrantSubjectTypes = ['actor', 'organization', 'site'] as const;

export type PermissionGrantTargetType = (typeof permissionGrantTargetTypes)[number];
export type PermissionGrantTargetId = Id<'actors'> | Id<'organizations'> | Id<'sites'> | null;
export type PermissionGrantSubjectType = (typeof permissionGrantSubjectTypes)[number];
export type PermissionGrantSubjectId = Id<'actors'> | Id<'organizations'> | Id<'sites'>;

export const permissionGrantSources = ['actorRole', 'siteActor', 'application', 'manual'] as const;

export type PermissionGrantSource = (typeof permissionGrantSources)[number];

export function getAllowedTargetTypes(permission: Permission): readonly PermissionGrantTargetType[] {
    if (permission === 'org.actor.view' || permission === 'org.actor.invite') return ['actor'];
    if (permission.startsWith('org.actor.serviceAccount.')) return ['platform', 'organization'];
    if (permission.startsWith('platform.')) return ['platform'];
    if (permission.startsWith('org.site.')) return ['platform', 'organization', 'site'];
    return ['platform', 'organization'];
}

export function getAllowedSubjectTypes(permission: Permission): readonly PermissionGrantSubjectType[] {
    if (permission === 'org.actor.view' || permission === 'org.actor.invite') return ['actor', 'organization', 'site'];
    return ['actor'];
}

export function isTargetTypeAllowed(permission: Permission, targetType: PermissionGrantTargetType): boolean {
    return getAllowedTargetTypes(permission).includes(targetType);
}

export function isSubjectTypeAllowed(permission: Permission, subjectType: PermissionGrantSubjectType): boolean {
    return getAllowedSubjectTypes(permission).includes(subjectType);
}
