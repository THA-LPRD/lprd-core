import { preloadedQueryResult, preloadQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import { SiteProvider } from '@/providers/site-provider';
import { requireAuthorization } from '@/lib/authz';

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

    return (
        <SiteProvider site={site} authorization={authorization!} members={members}>
            {children}
        </SiteProvider>
    );
}
