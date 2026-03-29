import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '@convex/api';
import { withAuth } from '@workos-inc/authkit-nextjs';

export default async function RootPage() {
    const auth = await withAuth();

    if (!auth.user || !auth.accessToken) {
        redirect('/login');
    }

    const actor = await fetchQuery(api.actors.me, {}, { token: auth.accessToken });

    if (!actor) {
        redirect('/login');
    }

    if (actor.role === 'appAdmin') {
        redirect('/admin');
    }

    const sites = await fetchQuery(api.sites.list, {}, { token: auth.accessToken });
    const lastSite = actor.lastSiteSlug ? sites.find((site) => site.slug === actor.lastSiteSlug) : null;

    if (sites.length > 0) {
        redirect(`/site/${(lastSite ?? sites[0]).slug}`);
    }

    redirect('/site');
}
