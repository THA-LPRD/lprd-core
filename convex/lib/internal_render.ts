import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { getCurrentActor } from '../actors';

type Ctx = QueryCtx | MutationCtx;

export async function canAccessWithInternalRenderScope(ctx: Ctx): Promise<boolean> {
    const actor = await getCurrentActor(ctx);
    if (!actor) return false;

    const application = await ctx.db
        .query('applications')
        .withIndex('by_actor', (q) => q.eq('actorId', actor._id as Id<'actors'>))
        .unique();

    if (!application) return false;
    if (application.type !== 'internal' || application.status !== 'active') return false;
    return application.scopes?.includes('internal_render') ?? false;
}

export async function requireInternalRenderScope(ctx: Ctx): Promise<void> {
    if (!(await canAccessWithInternalRenderScope(ctx))) {
        throw new Error('Requires internal application with internal_render scope');
    }
}
