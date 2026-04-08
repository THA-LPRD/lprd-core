import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '@convex/api';
import { permissionCatalog } from '@/lib/permissions';
import { requireAuthorization } from '@/lib/authz';

export default async function RootPage() {
    const session = await requireAuthorization({ redirectTo: '/login' });

    const { actor } = session;

    if (session.can(permissionCatalog.platform.actor.manage)) {
        redirect('/admin');
    }

    const sites = await fetchQuery(api.sites.list, {}, { token: session.accessToken });
    const lastSite = actor.lastSiteSlug ? sites.find((site) => site.slug === actor.lastSiteSlug) : null;

    if (sites.length > 0) {
        redirect(`/site/${(lastSite ?? sites[0]).slug}`);
    }

    redirect('/site');
}
