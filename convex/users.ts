import {v} from 'convex/values';
import {internalMutation, mutation, type MutationCtx, query, type QueryCtx} from './_generated/server';
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
 * Helper to add avatarUrl to a user object by resolving storage ID.
 */
export async function withAvatarUrl<T extends {avatarStorageId?: Id<'_storage'>}>(
    ctx: QueryCtx,
    user: T,
): Promise<T & {avatarUrl: string | null}> {
    let avatarUrl: string | null = null;
    if (user.avatarStorageId) {
        avatarUrl = await ctx.storage.getUrl(user.avatarStorageId);
    }
    return {...user, avatarUrl};
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
 * Create user from WorkOS webhook (idempotent).
 * Called when user.created event is received.
 */
export const createFromWebhook = internalMutation({
	args: {
		authId: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		avatarStorageId: v.optional(v.id('_storage')),
	},
	handler: async (ctx, args) => {
		// Check if already exists (idempotency)
		const existing = await ctx.db
			.query('users')
			.withIndex('by_authId', (q) => q.eq('authId', args.authId))
			.unique();

		if (existing) return existing._id;

		const now = Date.now();
		return ctx.db.insert('users', {
			authId: args.authId,
			email: args.email,
			name: args.name,
			avatarStorageId: args.avatarStorageId,
			role: 'user',
			createdAt: now,
			updatedAt: now,
		});
	},
});

/**
 * Update user from WorkOS webhook.
 * Called when user.updated event is received.
 */
export const updateFromWebhook = internalMutation({
	args: {
		authId: v.string(),
		email: v.optional(v.string()),
		name: v.optional(v.string()),
		avatarStorageId: v.optional(v.id('_storage')),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_authId', (q) => q.eq('authId', args.authId))
			.unique();

		if (!user) throw new Error('User not found');

		const updates: Record<string, unknown> = {updatedAt: Date.now()};
		if (args.email !== undefined) updates.email = args.email;
		if (args.name !== undefined) updates.name = args.name;
		if (args.avatarStorageId !== undefined) updates.avatarStorageId = args.avatarStorageId;

		await ctx.db.patch(user._id, updates);
	},
});

/**
 * Delete user from WorkOS webhook (cascade to memberships).
 * Called when user.deleted event is received.
 */
export const deleteFromWebhook = internalMutation({
	args: {authId: v.string()},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_authId', (q) => q.eq('authId', args.authId))
			.unique();

		if (!user) return; // Already deleted - idempotent

		// Delete memberships first
		const memberships = await ctx.db
			.query('organizationMembers')
			.withIndex('by_user', (q) => q.eq('userId', user._id))
			.collect();

		for (const membership of memberships) {
			await ctx.db.delete(membership._id);
		}

		await ctx.db.delete(user._id);
	},
});

/**
 * Get current authenticated user.
 */
export const me = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;
        return withAvatarUrl(ctx, user);
    },
});

/**
 * Get a user by ID.
 */
export const getById = query({
    args: {id: v.id('users')},
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id);
        if (!user) return null;
        return withAvatarUrl(ctx, user);
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