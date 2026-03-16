/**
 * ACL (Access Control Layer) - Portable permission functions
 *
 */

export type UserRole = 'appAdmin' | 'user';
export type SiteMemberRole = 'siteAdmin' | 'user';

export type User = { role: UserRole };
export type SiteMembership = { role: SiteMemberRole } | null;

export interface Permissions {
    platform: {
        setUserRoles: boolean;
    };
    site: {
        create: boolean;
        view: boolean;
        manage: boolean;
    };
    device: {
        view: boolean;
        manage: boolean;
    };
    template: {
        view: boolean;
        manage: boolean;
    };
    frame: {
        view: boolean;
        manage: boolean;
    };
    plugin: {
        manage: boolean; // appAdmin: create slots, suspend, reissue tokens
        siteManage: boolean; // appAdmin or siteAdmin: enable/disable plugins per site
    };
}

/**
 * Returns all permissions for a user in a given context.
 *
 * @param user - The user object with their platform role
 * @param membership - The user's membership in the site context (null if not a member)
 * @returns Permission object with grouped capabilities
 */
export function getPermissions(user: User, membership: SiteMembership): Permissions {
    const isAppAdmin = user.role === 'appAdmin';
    const isSiteAdmin = membership?.role === 'siteAdmin';

    return {
        platform: {
            setUserRoles: isAppAdmin,
        },
        site: {
            create: true, // any authenticated user
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isSiteAdmin, // update, add/remove members
        },
        device: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isSiteAdmin, // create, update, remove
        },
        template: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isSiteAdmin,
        },
        frame: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isSiteAdmin,
        },
        plugin: {
            manage: isAppAdmin,
            siteManage: isAppAdmin || !!isSiteAdmin,
        },
    };
}
