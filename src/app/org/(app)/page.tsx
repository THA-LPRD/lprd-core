'use client';

import type { Ref } from 'react';
import { redirect } from 'next/navigation';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { api } from '@convex/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function OnboardingView() {
    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome to LPRD</h1>
                    <p className="text-muted-foreground mt-2">
                        Create your first organization to get started, or join an existing one with an invite.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        nativeButton={false}
                        render={({ ref, ...props }) => (
                            <Link {...props} ref={ref as Ref<HTMLAnchorElement>} href="/org/create">
                                Create Organization
                            </Link>
                        )}
                    />
                    <p className="text-sm text-muted-foreground">
                        Have an invite? Check your email for the invite link.
                    </p>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="p-6">
            <div className="mb-8">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
            </div>
        </div>
    );
}

function OrgLandingContent() {
    const user = useQuery(api.users.me);
    const orgs = useQuery(api.organizations.list);

    // Loading
    if (user === undefined || orgs === undefined) {
        return <LoadingSkeleton />;
    }

    // Has lastOrgSlug that exists
    if (user?.lastOrgSlug) {
        const lastOrg = orgs.find((o) => o.slug === user.lastOrgSlug);
        if (lastOrg) {
            redirect(`/org/${lastOrg.slug}`);
        }
    }

    // Has orgs but no valid lastOrgSlug - pick first
    if (orgs.length > 0) {
        redirect(`/org/${orgs[0].slug}`);
    }

    // No orgs - show onboarding
    return <OnboardingView />;
}

export default function OrgLandingPage() {
    return (
        <main className="flex-1">
            <OrgLandingContent />
        </main>
    );
}
