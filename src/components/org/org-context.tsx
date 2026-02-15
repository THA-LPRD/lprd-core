'use client';

import { createContext, useContext } from 'react';
import type { FunctionReturnType } from 'convex/server';
import type { api } from '@convex/api';
import type { Permissions } from '@/lib/acl';

export type Org = NonNullable<FunctionReturnType<typeof api.organizations.getBySlug>>;
export type User = NonNullable<FunctionReturnType<typeof api.users.me>>;
export type Members = FunctionReturnType<typeof api.organizations.listMembers>;
export type Member = Members[number];

export interface OrgContextValue {
    org: Org;
    user: User;
    members: Members;
    currentMember: Member | null;
    permissions: Permissions;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
    const ctx = useContext(OrgContext);
    if (!ctx) {
        throw new Error('useOrg must be used within an OrgProvider');
    }
    return ctx;
}
