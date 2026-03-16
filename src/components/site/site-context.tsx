'use client';

import { createContext, useContext } from 'react';
import type { FunctionReturnType } from 'convex/server';
import type { api } from '@convex/api';
import type { Permissions } from '@/lib/acl';

export type Site = NonNullable<FunctionReturnType<typeof api.sites.getBySlug>>;
export type User = NonNullable<FunctionReturnType<typeof api.users.me>>;
export type Members = FunctionReturnType<typeof api.sites.listMembers>;
export type Member = Members[number];

export interface SiteContextValue {
    site: Site;
    user: User;
    members: Members;
    currentMember: Member | null;
    permissions: Permissions;
}

export const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
    const ctx = useContext(SiteContext);
    if (!ctx) {
        throw new Error('useSite must be used within a SiteProvider');
    }
    return ctx;
}
