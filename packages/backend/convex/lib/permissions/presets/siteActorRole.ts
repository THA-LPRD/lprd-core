import { type Permission, permissionCatalog } from '../catalog';

export type SiteActorRole = 'siteAdmin' | 'user';

export function getSiteActorDefaultPermissions(role: SiteActorRole): Permission[] {
    if (role === 'siteAdmin') {
        return [
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

    return [
        permissionCatalog.org.site.view,
        permissionCatalog.org.site.template.view,
        permissionCatalog.org.site.frame.view,
        permissionCatalog.org.site.device.view,
        permissionCatalog.org.site.asset.view,
    ];
}

export function getSiteActorMaxPermissions(role: SiteActorRole): Permission[] {
    return getSiteActorDefaultPermissions(role);
}
