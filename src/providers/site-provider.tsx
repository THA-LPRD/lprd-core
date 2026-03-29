'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';
import type { FunctionReturnType } from 'convex/server';
import type { Preloaded } from 'convex/react';
import { usePreloadedQuery } from 'convex/react';
import { api } from '@convex/api';
import { SiteNotFound } from '@/components/ui/not-found';
import { getPermissions } from '@/lib/acl';

export type Site = NonNullable<FunctionReturnType<typeof api.sites.getBySlug>>;
export type Actor = NonNullable<FunctionReturnType<typeof api.actors.me>>;
export type Members = FunctionReturnType<typeof api.sites.listMembers>;
export type Member = Members[number];

export interface SiteContextValue {
    site: Site;
    actor: Actor;
    members: Members;
    currentMember: Member | null;
    permissions: ReturnType<typeof getPermissions>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
    site,
    actor,
    members,
    children,
}: {
    site: Preloaded<typeof api.sites.getBySlug>;
    actor: Preloaded<typeof api.actors.me>;
    members: Preloaded<typeof api.sites.listMembers> | null;
    children: React.ReactNode;
}) {
    const resolvedSite = usePreloadedQuery(site);
    const resolvedActor = usePreloadedQuery(actor);

    if (!resolvedSite || !resolvedActor) {
        return <SiteNotFound />;
    }

    if (!members) {
        return <SiteNotFound />;
    }

    return (
        <ResolvedSiteProvider site={resolvedSite} actor={resolvedActor} members={members}>
            {children}
        </ResolvedSiteProvider>
    );
}

function ResolvedSiteProvider({
    site,
    actor,
    members,
    children,
}: {
    site: Site;
    actor: Actor;
    members: Preloaded<typeof api.sites.listMembers>;
    children: React.ReactNode;
}) {
    const resolvedMembers = usePreloadedQuery(members);

    const currentMember = React.useMemo(() => {
        return resolvedMembers.find((member) => member.actor?._id === actor._id) ?? null;
    }, [actor, resolvedMembers]);

    const permissions = React.useMemo(() => {
        return getPermissions(actor, currentMember);
    }, [actor, currentMember]);

    return (
        <SiteContext.Provider value={{ site, actor, members: resolvedMembers, currentMember, permissions }}>
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
