'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { OrgContext } from '@/components/org/org-context';
import { OrgNotFound } from '@/components/ui/not-found';
import { Skeleton } from '@/components/ui/skeleton';
import { getPermissions } from '@/lib/acl';

export function OrgProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
    const org = useQuery(api.organizations.getBySlug, { slug });
    const user = useQuery(api.users.me);
    const members = useQuery(api.organizations.listMembers, org ? { organizationId: org._id } : 'skip');

    const currentMember = React.useMemo(() => {
        if (!user || !members) return null;
        return members.find((m) => m.user?._id === user._id) ?? null;
    }, [user, members]);

    const permissions = React.useMemo(() => {
        if (!user) return null;
        return getPermissions(user, currentMember);
    }, [user, currentMember]);

    if (org === undefined || user === undefined || members === undefined) {
        return (
            <div className="p-6">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
            </div>
        );
    }

    if (!org || !user || !permissions) {
        return <OrgNotFound />;
    }

    return (
        <OrgContext.Provider value={{ org, user, members, currentMember, permissions }}>{children}</OrgContext.Provider>
    );
}
