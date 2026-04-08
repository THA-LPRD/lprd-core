import Link from 'next/link';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '@convex/api';
import { buttonVariants } from '@/components/ui/button';
import { requireAuthorization } from '@/lib/authz';

function OnboardingView() {
    return (
        <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md space-y-6 text-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome to LPRD</h1>
                    <p className="mt-2 text-muted-foreground">
                        Create your first site to get started, or join an existing one with an invite.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Link href="/site/create" className={buttonVariants()}>
                        Create Site
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        Have an invite? Check your email for the invite link.
                    </p>
                </div>
            </div>
        </main>
    );
}

export default async function SiteLandingPage() {
    const session = await requireAuthorization({ redirectTo: '/login' });

    const { actor } = session;

    const sites = await fetchQuery(api.sites.list, {}, { token: session.accessToken });
    const lastSite = actor.lastSiteSlug ? sites.find((site) => site.slug === actor.lastSiteSlug) : null;

    if (sites.length > 0) {
        redirect(`/site/${(lastSite ?? sites[0]).slug}`);
    }

    return <OnboardingView />;
}
