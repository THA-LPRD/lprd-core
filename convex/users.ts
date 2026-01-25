import {v} from 'convex/values';
import {mutation, type MutationCtx, query, type QueryCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
import {userRole} from './schema';
import {getPermissions} from './lib/acl';

type Ctx = QueryCtx | MutationCtx;

/**
 * Get current authenticated user from context.
 * Returns null if not authenticated or user not found.
 */
export async function getCurrentUser(ctx: Ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return ctx.db
        .query('users')
        .withIndex('by_authId', (q) => q.eq('authId', identity.subject))
        .unique();
}

/**
 * Get membership for a user in an organization.
 */
export async function getMembership(ctx: Ctx, userId: Id<'users'>, orgId: Id<'organizations'>) {
    return ctx.db
        .query('organizationMembers')
        .withIndex('by_user_and_org', (q) => q.eq('userId', userId).eq('organizationId', orgId))
        .unique();
}

/**
 * Create or update user from authenticated identity.
 * Called on first login to sync WorkOS user to Convex.
 */
export const getOrCreate = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error('Not authenticated');

        const existing = await ctx.db
            .query('users')
            .withIndex('by_authId', (q) => q.eq('authId', identity.subject))
            .unique();

        if (existing) {
            const updates: Record<string, unknown> = {};
            if (identity.email && identity.email !== existing.email) updates.email = identity.email;
            if (identity.name && identity.name !== existing.name) updates.name = identity.name;
            if (identity.pictureUrl && identity.pictureUrl !== existing.avatarUrl) updates.avatarUrl = identity.pictureUrl;

            if (Object.keys(updates).length > 0) {
                updates.updatedAt = Date.now();
                await ctx.db.patch(existing._id, updates);
            }
            return existing._id;
        }

        const now = Date.now();
        return ctx.db.insert('users', {
            authId: identity.subject,
            email: identity.email ?? '',
            name: identity.name,
            avatarUrl: identity.pictureUrl,
            role: 'user',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get current authenticated user.
 */
export const me = query({
    args: {},
    handler: async (ctx) => getCurrentUser(ctx),
});

/**
 * Get a user by ID.
 */
export const getById = query({
    args: {id: v.id('users')},
    handler: async (ctx, args) => ctx.db.get(args.id),
});

/**
 * Update current user's profile.
 */
export const update = mutation({
    args: {
        name: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        await ctx.db.patch(user._id, {...args, updatedAt: Date.now()});
    },
});

/**
 * Set a user's platform role.
 * Only appAdmins can do this.
 */
export const setRole = mutation({
    args: {
        id: v.id('users'),
        role: userRole,
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const perms = getPermissions(user, null);
        if (!perms.platform.setUserRoles) throw new Error('Forbidden');

        await ctx.db.patch(args.id, {role: args.role, updatedAt: Date.now()});
    },
});

/**
 * Set current user's last visited organization slug.
 * Used for auto-redirecting to last org.
 */
export const setLastOrg = mutation({
    args: {slug: v.string()},
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        await ctx.db.patch(user._id, {lastOrgSlug: args.slug, updatedAt: Date.now()});
    },
});