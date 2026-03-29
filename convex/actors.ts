import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, type MutationCtx, query, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { actorRole } from './schema';
import { getPermissions } from './lib/acl';

type Ctx = QueryCtx | MutationCtx;

/**
 * Get current authenticated actor from context.
 * Returns null if not authenticated or actor not found.
 */
export async function getCurrentActor(ctx: Ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return ctx.db
        .query('actors')
        .withIndex('by_workosUserId', (q) => q.eq('workosUserId', identity.subject))
        .unique();
}

/**
 * Helper to add avatarUrl to an actor-like object by resolving storage ID.
 */
export async function withAvatarUrl<T extends { avatarStorageId?: Id<'_storage'> }>(
    ctx: QueryCtx,
    actor: T,
): Promise<T & { avatarUrl: string | null }> {
    let avatarUrl: string | null = null;
    if (actor.avatarStorageId) {
        avatarUrl = await ctx.storage.getUrl(actor.avatarStorageId);
    }
    return { ...actor, avatarUrl };
}

/**
 * Get membership for an actor in a site.
 */
export async function getMembership(ctx: Ctx, actorId: Id<'actors'>, siteId: Id<'sites'>) {
    return ctx.db
        .query('siteMembers')
        .withIndex('by_actor_and_site', (q) => q.eq('actorId', actorId).eq('siteId', siteId))
        .unique();
}

export const getActorByWorkosUserId = internalQuery({
    args: { workosUserId: v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query('actors')
            .withIndex('by_workosUserId', (q) => q.eq('workosUserId', args.workosUserId))
            .unique();
    },
});

/**
 * Create actor from WorkOS webhook (idempotent).
 * Called when user.created event is received.
 */
export const createFromWebhook = internalMutation({
    args: {
        workosUserId: v.string(),
        workosOrganizationId: v.optional(v.string()),
        email: v.string(),
        name: v.optional(v.string()),
        avatarStorageId: v.optional(v.id('_storage')),
    },
    handler: async (ctx, args) => {
        const existingActor = await ctx.db
            .query('actors')
            .withIndex('by_workosUserId', (q) => q.eq('workosUserId', args.workosUserId))
            .unique();
        if (existingActor) return existingActor._id;

        const now = Date.now();
        return ctx.db.insert('actors', {
            type: 'user',
            workosUserId: args.workosUserId,
            workosOrganizationId: args.workosOrganizationId,
            email: args.email,
            name: args.name,
            avatarStorageId: args.avatarStorageId,
            status: 'active',
            role: 'user',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Update actor from WorkOS webhook.
 * Called when user.updated event is received.
 */
export const updateFromWebhook = internalMutation({
    args: {
        workosUserId: v.string(),
        workosOrganizationId: v.optional(v.string()),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        avatarStorageId: v.optional(v.id('_storage')),
    },
    handler: async (ctx, args) => {
        const actor = await ctx.db
            .query('actors')
            .withIndex('by_workosUserId', (q) => q.eq('workosUserId', args.workosUserId))
            .unique();
        if (!actor) {
            throw new Error('Actor not found');
        }

        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        if (args.workosOrganizationId !== undefined) updates.workosOrganizationId = args.workosOrganizationId;
        if (args.email !== undefined) updates.email = args.email;
        if (args.name !== undefined) updates.name = args.name;
        if (args.avatarStorageId !== undefined) updates.avatarStorageId = args.avatarStorageId;

        await ctx.db.patch(actor._id, updates);
    },
});

/**
 * Delete actor from WorkOS webhook (cascade to memberships).
 * Called when user.deleted event is received.
 */
export const deleteFromWebhook = internalMutation({
    args: { workosUserId: v.string() },
    handler: async (ctx, args) => {
        const actor = await ctx.db
            .query('actors')
            .withIndex('by_workosUserId', (q) => q.eq('workosUserId', args.workosUserId))
            .unique();

        if (!actor) return;

        const memberships = await ctx.db
            .query('siteMembers')
            .withIndex('by_actor', (q) => q.eq('actorId', actor._id))
            .collect();

        for (const membership of memberships) {
            await ctx.db.delete(membership._id);
        }

        await ctx.db.delete(actor._id);
    },
});

/**
 * Get current authenticated actor.
 */
export const me = query({
    args: {},
    handler: async (ctx) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;
        return withAvatarUrl(ctx, actor);
    },
});

/**
 * List all human actors. AppAdmin only.
 */
export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];
        const perms = getPermissions(actor, null);
        if (!perms.platform.setUserRoles) return [];

        return ctx.db
            .query('actors')
            .filter((q) => q.eq(q.field('type'), 'user'))
            .collect();
    },
});

/**
 * Get an actor by ID.
 */
export const getById = query({
    args: { id: v.id('actors') },
    handler: async (ctx, args) => {
        const actor = await ctx.db.get(args.id);
        if (!actor) return null;
        return withAvatarUrl(ctx, actor);
    },
});

/**
 * Set an actor's platform role.
 * Only appAdmins can do this.
 */
export const setRole = mutation({
    args: {
        id: v.id('actors'),
        role: actorRole,
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const perms = getPermissions(actor, null);
        if (!perms.platform.setUserRoles) throw new Error('Forbidden');

        await ctx.db.patch(args.id, { role: args.role, updatedAt: Date.now() });
    },
});

/**
 * Set current actor's last visited site slug.
 * Used for auto-redirecting to last site.
 */
export const setLastSite = mutation({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        await ctx.db.patch(actor._id, { lastSiteSlug: args.slug, updatedAt: Date.now() });
    },
});
