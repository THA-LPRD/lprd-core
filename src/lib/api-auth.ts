import { fetchQuery } from 'convex/nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { authenticateApplication, AuthError, requireScope } from '@/lib/application/auth';

export async function authenticateWorkerRequest(request: Request) {
    const application = await authenticateApplication(request, 'internal');
    requireScope(application, 'internal_render');
    return application;
}

export async function requireManagedSite(siteId: Id<'sites'>) {
    const auth = await withAuth();
    if (!auth.user || !auth.accessToken) {
        throw new AuthError('Unauthorized', 401);
    }

    const actor = await fetchQuery(api.actors.me, {}, { token: auth.accessToken });
    if (!actor) {
        throw new AuthError('Unauthorized', 401);
    }

    if (actor.role === 'appAdmin') {
        return { actor, accessToken: auth.accessToken };
    }

    const members = await fetchQuery(api.sites.listMembers, { siteId }, { token: auth.accessToken });
    const membership = members.find((member) => member.actor?._id === actor._id);
    if (!membership || membership.role !== 'siteAdmin') {
        throw new AuthError('Forbidden', 403);
    }

    return { actor, accessToken: auth.accessToken };
}
