import { type Permission, permissionCatalog, permissionValues } from '../catalog';

export type ActorRole = 'appAdmin' | 'user';
export type ActorType = 'user' | 'serviceAccount';

export function getActorRoleDefaultPermissions(role: ActorRole, actorType: ActorType): Permission[] {
    if (actorType !== 'user') return [];

    if (role === 'appAdmin') {
        return [
            permissionCatalog.platform.actor.manage,
            permissionCatalog.org.view,
            permissionCatalog.org.manage,
            permissionCatalog.org.actor.serviceAccount.manage,
            permissionCatalog.org.site.create,
            permissionCatalog.org.template.view,
            permissionCatalog.org.template.manage.self,
            permissionCatalog.org.template.manage.upsert.self,
            permissionCatalog.org.site.view,
            permissionCatalog.org.site.manage,
            permissionCatalog.org.site.template.view,
            permissionCatalog.org.site.template.manage.self,
            permissionCatalog.org.site.frame.view,
            permissionCatalog.org.site.frame.manage.self,
            permissionCatalog.org.site.device.view,
            permissionCatalog.org.site.device.manage.self,
            permissionCatalog.org.site.pluginData.view,
            permissionCatalog.org.site.pluginData.manage.self,
            permissionCatalog.org.site.actor.manage,
            permissionCatalog.org.site.asset.view,
            permissionCatalog.org.site.asset.manage,
        ];
    }

    return [permissionCatalog.org.view, permissionCatalog.org.site.create, permissionCatalog.org.template.view];
}

export function getActorRoleMaxPermissions(role: ActorRole, actorType: ActorType): Permission[] {
    if (actorType !== 'user') return [];
    if (role === 'appAdmin') return [...permissionValues];
    return [permissionCatalog.org.view, permissionCatalog.org.site.create, permissionCatalog.org.template.view];
}
