/**
 * ACL (Access Control Layer) - Portable permission functions
 *
 */

export type ActorRole = 'appAdmin' | 'user';
export type SiteMemberRole = 'siteAdmin' | 'user';

export type Actor = { role: ActorRole };
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
 * Returns all permissions for an actor in a given context.
 *
 * @param actor - The actor object with their platform role
 * @param membership - The actor's membership in the site context (null if not a member)
 * @returns Permission object with grouped capabilities
 */
export function getPermissions(actor: Actor, membership: SiteMembership): Permissions {
    const isAppAdmin = actor.role === 'appAdmin';
    const isSiteAdmin = membership?.role === 'siteAdmin';

    return {
        platform: {
            setUserRoles: isAppAdmin,
        },
        site: {
            create: true, // any authenticated actor
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || isSiteAdmin, // update, add/remove members
        },
        device: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || isSiteAdmin, // create, update, remove
        },
        template: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || isSiteAdmin,
        },
        frame: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || isSiteAdmin,
        },
        plugin: {
            manage: isAppAdmin,
            siteManage: isAppAdmin || isSiteAdmin,
        },
    };
}
