/**
 * ACL (Access Control Layer) - Portable permission functions
 *
 */

export type UserRole = 'appAdmin' | 'user';
export type OrgMemberRole = 'orgAdmin' | 'user';

export type User = {role: UserRole};
export type OrgMembership = {role: OrgMemberRole} | null;

export interface Permissions {
    platform: {
        setUserRoles: boolean;
    };
    org: {
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
}

/**
 * Returns all permissions for a user in a given context.
 *
 * @param user - The user object with their platform role
 * @param membership - The user's membership in the org context (null if not a member)
 * @returns Permission object with grouped capabilities
 */
export function getPermissions(user: User, membership: OrgMembership): Permissions {
    const isAppAdmin = user.role === 'appAdmin';
    const isOrgAdmin = membership?.role === 'orgAdmin';

    return {
        platform: {
            setUserRoles: isAppAdmin,
        },
        org: {
            create: true, // any authenticated user
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isOrgAdmin, // update, add/remove members
        },
        device: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isOrgAdmin, // create, update, remove
        },
        template: {
            view: isAppAdmin || !!membership,
            manage: isAppAdmin || !!isOrgAdmin,
        },
    };
}