'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';
import type { FunctionReturnType } from 'convex/server';
import type { Preloaded } from 'convex/react';
import { usePreloadedQuery } from 'convex/react';
import { api } from '@convex/api';
import { SiteNotFound } from '@/components/ui/not-found';
import { buildPermissionState, type Permissions } from '@/lib/permissions';

export type Site = NonNullable<FunctionReturnType<typeof api.sites.getBySlug>>;
export type Actor = NonNullable<FunctionReturnType<typeof api.authorization.current>>['actor'];
export type Members = FunctionReturnType<typeof api.siteActors.listBySite>;
export type Member = Members[number];
export type SiteAuthorization = NonNullable<FunctionReturnType<typeof api.authorization.forSite>>;

export interface SiteContextValue {
    site: Site;
    actor: Actor;
    members: Members;
    currentMember: Member | null;
    currentSiteActor: SiteAuthorization['siteActor'];
    permissions: Permissions;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
    site,
    authorization,
    members,
    children,
}: {
    site: Preloaded<typeof api.sites.getBySlug>;
    authorization: Preloaded<typeof api.authorization.forSite>;
    members: Preloaded<typeof api.siteActors.listBySite> | null;
    children: React.ReactNode;
}) {
    const resolvedSite = usePreloadedQuery(site);
    const resolvedAuthorization = usePreloadedQuery(authorization);

    if (!resolvedSite || !resolvedAuthorization) {
        return <SiteNotFound />;
    }

    if (!members) {
        return <SiteNotFound />;
    }

    return (
        <ResolvedSiteProvider site={resolvedSite} authorization={resolvedAuthorization} members={members}>
            {children}
        </ResolvedSiteProvider>
    );
}

function ResolvedSiteProvider({
    site,
    authorization,
    members,
    children,
}: {
    site: Site;
    authorization: SiteAuthorization;
    members: Preloaded<typeof api.siteActors.listBySite>;
    children: React.ReactNode;
}) {
    const resolvedMembers = usePreloadedQuery(members);
    const actor = authorization.actor;

    const currentMember = React.useMemo(() => {
        return resolvedMembers.find((member) => member.actor?._id === actor._id) ?? null;
    }, [actor, resolvedMembers]);

    const permissions = React.useMemo(() => {
        return buildPermissionState(authorization.grantedPermissions).permissions;
    }, [authorization.grantedPermissions]);

    return (
        <SiteContext.Provider
            value={{
                site,
                actor,
                members: resolvedMembers,
                currentMember,
                currentSiteActor: authorization.siteActor,
                permissions,
            }}
        >
            {children}
        </SiteContext.Provider>
    );
}

export function useSite(): SiteContextValue {
    const context = useContext(SiteContext);
    if (!context) {
        throw new Error('useSite must be used within a SiteProvider');
    }
    return context;
}
