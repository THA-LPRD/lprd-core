export { permissionCatalog, permissionValues, type ApplicationPermission, type Permission } from './catalog';
export {
    buildPermissionState,
    hasPermission,
    isApplicationPermission,
    normalizeStoredPermissionValue,
    normalizeApplicationPermissions,
    type PermissionState,
    type Permissions,
    type StoredPermissionValue,
} from './matcher';
export {
    getAllowedTargetTypes,
    getAllowedSubjectTypes,
    isSubjectTypeAllowed,
    isTargetTypeAllowed,
    permissionGrantSources,
    permissionGrantSubjectTypes,
    permissionGrantTargetTypes,
    type PermissionGrantSource,
    type PermissionGrantSubjectId,
    type PermissionGrantSubjectType,
    type PermissionGrantTargetId,
    type PermissionGrantTargetType,
} from './targets';
export {
    getActorRoleDefaultPermissions,
    getActorRoleMaxPermissions,
    type ActorRole,
    type ActorType,
} from './presets/actorRole';
export { getServiceAccountDefaultPermissions } from './presets/serviceAccount';
export {
    getSiteActorDefaultPermissions,
    getSiteActorMaxPermissions,
    type SiteActorRole,
} from './presets/siteActorRole';
