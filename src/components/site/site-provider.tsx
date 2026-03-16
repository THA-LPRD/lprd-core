'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { SiteContext } from '@/components/site/site-context';
import { SiteNotFound } from '@/components/ui/not-found';
import { Skeleton } from '@/components/ui/skeleton';
import { getPermissions } from '@/lib/acl';

export function SiteProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
    const site = useQuery(api.sites.getBySlug, { slug });
    const user = useQuery(api.users.me);
    const members = useQuery(api.sites.listMembers, site ? { siteId: site._id } : 'skip');

    const currentMember = React.useMemo(() => {
        if (!user || !members) return null;
        return members.find((m) => m.user?._id === user._id) ?? null;
    }, [user, members]);

    const permissions = React.useMemo(() => {
        if (!user) return null;
        return getPermissions(user, currentMember);
    }, [user, currentMember]);

    if (site === undefined || user === undefined || members === undefined) {
        return (
            <div className="p-6">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
            </div>
        );
    }

    if (!site || !user || !permissions) {
        return <SiteNotFound />;
    }

    return (
        <SiteContext.Provider value={{ site, user, members, currentMember, permissions }}>
            {children}
        </SiteContext.Provider>
    );
}
