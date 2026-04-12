import { type ApplicationPermission, type Permission, permissionCatalog, permissionValues } from './catalog';

export type StoredPermissionValue = string | number | bigint | boolean;

const permissionValueSet = new Set<string>(permissionValues);

export interface Permissions {
    platform: {
        actor: {
            manage: boolean;
        };
    };
    org: {
        view: boolean;
        manage: boolean;
        actor: {
            view: boolean;
            invite: boolean;
            serviceAccount: {
                manage: boolean;
            };
        };
        site: {
            create: boolean;
            view: boolean;
            manage: boolean;
            actor: {
                manage: boolean;
            };
            template: {
                view: boolean;
                manage: boolean;
                job: { write: boolean };
            };
            frame: {
                view: boolean;
                manage: boolean;
                job: { write: boolean };
            };
            device: {
                view: boolean;
                manage: boolean;
                job: { write: boolean };
            };
            pluginData: {
                read: boolean;
                write: boolean;
            };
            asset: {
                view: boolean;
                manage: boolean;
            };
        };
        template: {
            view: boolean;
            manage: boolean;
        };
    };
}

function uniquePermissions(permissions: readonly Permission[]): Permission[] {
    return [...new Set(permissions)];
}

export function hasPermission(grantedPermissions: readonly Permission[], permission: Permission): boolean {
    return grantedPermissions.some(
        (grantedPermission) => permission === grantedPermission || permission.startsWith(`${grantedPermission}.`),
    );
}

export function normalizeStoredPermissionValue(permission: StoredPermissionValue): Permission | null {
    if (typeof permission !== 'string') return null;
    return isApplicationPermission(permission) ? permission : null;
}

function summarizePermissions(grantedPermissions: Permission[]): Permissions {
    return {
        platform: {
            actor: {
                manage: hasPermission(grantedPermissions, permissionCatalog.platform.actor.manage),
            },
        },
        org: {
            view: hasPermission(grantedPermissions, permissionCatalog.org.view),
            manage: hasPermission(grantedPermissions, permissionCatalog.org.manage),
            actor: {
                view: hasPermission(grantedPermissions, permissionCatalog.org.actor.view),
                invite: hasPermission(grantedPermissions, permissionCatalog.org.actor.invite),
                serviceAccount: {
                    manage: hasPermission(grantedPermissions, permissionCatalog.org.actor.serviceAccount.manage),
                },
            },
            site: {
                create: hasPermission(grantedPermissions, permissionCatalog.org.site.create),
                view: hasPermission(grantedPermissions, permissionCatalog.org.site.view),
                manage: hasPermission(grantedPermissions, permissionCatalog.org.site.manage),
                actor: {
                    manage: hasPermission(grantedPermissions, permissionCatalog.org.site.actor.manage),
                },
                template: {
                    view: hasPermission(grantedPermissions, permissionCatalog.org.site.template.view),
                    manage: hasPermission(grantedPermissions, permissionCatalog.org.site.template.manage.self),
                    job: {
                        write: hasPermission(grantedPermissions, permissionCatalog.org.site.template.manage.job.write),
                    },
                },
                frame: {
                    view: hasPermission(grantedPermissions, permissionCatalog.org.site.frame.view),
                    manage: hasPermission(grantedPermissions, permissionCatalog.org.site.frame.manage.self),
                    job: {
                        write: hasPermission(grantedPermissions, permissionCatalog.org.site.frame.manage.job.write),
                    },
                },
                device: {
                    view: hasPermission(grantedPermissions, permissionCatalog.org.site.device.view),
                    manage: hasPermission(grantedPermissions, permissionCatalog.org.site.device.manage.self),
                    job: {
                        write: hasPermission(grantedPermissions, permissionCatalog.org.site.device.manage.job.write),
                    },
                },
                pluginData: {
                    read: hasPermission(grantedPermissions, permissionCatalog.org.site.pluginData.view),
                    write: hasPermission(grantedPermissions, permissionCatalog.org.site.pluginData.manage.self),
                },
                asset: {
                    view: hasPermission(grantedPermissions, permissionCatalog.org.site.asset.view),
                    manage: hasPermission(grantedPermissions, permissionCatalog.org.site.asset.manage),
                },
            },
            template: {
                view: hasPermission(grantedPermissions, permissionCatalog.org.template.view),
                manage: hasPermission(grantedPermissions, permissionCatalog.org.template.manage.self),
            },
        },
    };
}

export function isApplicationPermission(permission: string): permission is ApplicationPermission {
    return permissionValueSet.has(permission);
}

export function normalizeApplicationPermissions(
    grantedPermissions: readonly StoredPermissionValue[],
): ApplicationPermission[] {
    const normalized: ApplicationPermission[] = [];

    for (const permission of grantedPermissions) {
        const resolvedPermission = normalizeStoredPermissionValue(permission);
        if (resolvedPermission) normalized.push(resolvedPermission);
    }

    return uniquePermissions(normalized);
}

export type PermissionState = {
    grantedPermissions: ApplicationPermission[];
    permissions: Permissions;
    can(permission: Permission): boolean;
};

export function buildPermissionState(grantedPermissions: readonly StoredPermissionValue[] = []): PermissionState {
    const resolvedPermissions = normalizeApplicationPermissions(grantedPermissions);
    const permissions = summarizePermissions(resolvedPermissions);

    return {
        grantedPermissions: resolvedPermissions,
        permissions,
        can(permission: Permission) {
            return hasPermission(resolvedPermissions, permission);
        },
    };
}
