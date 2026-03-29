import { preloadQuery, preloadedQueryResult } from 'convex/nextjs';
import { api } from '@convex/api';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { SiteProvider } from '@/providers/site-provider';

export default async function SlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const auth = await withAuth();
    const token = auth.accessToken;
    const site = await preloadQuery(api.sites.getBySlug, { slug }, { token });
    const actor = await preloadQuery(api.actors.me, {}, { token });
    const siteResult = preloadedQueryResult(site);
    const members = siteResult
        ? await preloadQuery(api.sites.listMembers, { siteId: siteResult._id }, { token })
        : null;

    return (
        <SiteProvider site={site} actor={actor} members={members}>
            {children}
        </SiteProvider>
    );
}
