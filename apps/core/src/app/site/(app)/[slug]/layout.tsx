import { api } from '@convex/api';
import { preloadedQueryResult, preloadQuery } from 'convex/nextjs';
import { SiteNotFound } from '@/components/ui/not-found';
import { requireAuthorization } from '@/lib/authz';
import { SiteProvider } from '@/providers/site-provider';

export default async function SlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const session = await requireAuthorization({ redirectTo: '/login' });
    const token = session.accessToken;
    const site = await preloadQuery(api.sites.getBySlug, { slug }, { token });
    const siteResult = preloadedQueryResult(site);
    const authorization = siteResult
        ? await preloadQuery(api.authorization.forSite, { siteId: siteResult._id }, { token })
        : null;
    const members = siteResult
        ? await preloadQuery(api.siteActors.listBySite, { siteId: siteResult._id }, { token })
        : null;

    if (!authorization || !members) {
        return <SiteNotFound />;
    }

    return (
        <SiteProvider site={site} authorization={authorization} members={members}>
            {children}
        </SiteProvider>
    );
}
