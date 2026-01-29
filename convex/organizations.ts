import {v} from 'convex/values';
import {mutation, query} from './_generated/server';
import {orgMemberRole} from './schema';
import {getPermissions} from './lib/acl';
import {getCurrentUser, getMembership, withAvatarUrl} from './users';

/**
 * Create a new organization.
 * Any authenticated user can create. Creator becomes orgAdmin.
 */
export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const perms = getPermissions(user, null);
        if (!perms.org.create) throw new Error('Forbidden');

        const existing = await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .unique();
        if (existing) throw new Error('Slug already exists');

        const now = Date.now();
        const orgId = await ctx.db.insert('organizations', {
            name: args.name,
            slug: args.slug,
            logoUrl: args.logoUrl,
            createdAt: now,
            updatedAt: now,
        });

        // Creator becomes orgAdmin
        await ctx.db.insert('organizationMembers', {
            userId: user._id,
            organizationId: orgId,
            role: 'orgAdmin',
            createdAt: now,
        });

        return orgId;
    },
});

/**
 * List organizations the current user can see.
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        // appAdmins can view all orgs (check with null membership)
        const globalPerms = getPermissions(user, null);
        if (globalPerms.org.view) {
            return ctx.db.query('organizations').collect();
        }

        // Others see only their memberships
        const memberships = await ctx.db
            .query('organizationMembers')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .collect();

        const orgs = await Promise.all(memberships.map((m) => ctx.db.get(m.organizationId)));
        return orgs.filter((org) => org !== null);
    },
});

/**
 * Get an organization by ID.
 */
export const getById = query({
    args: {id: v.id('organizations')},
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const org = await ctx.db.get(args.id);
        if (!org) return null;

        const membership = await getMembership(ctx, user._id, args.id);
        const perms = getPermissions(user, membership);
        if (!perms.org.view) return null;

        return org;
    },
});

/**
 * Get an organization by slug.
 */
export const getBySlug = query({
    args: {slug: v.string()},
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const org = await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .unique();
        if (!org) return null;

        const membership = await getMembership(ctx, user._id, org._id);
        const perms = getPermissions(user, membership);
        if (!perms.org.view) return null;

        return org;
    },
});

/**
 * Update an organization.
 * Requires org.manage permission.
 */
export const update = mutation({
    args: {
        id: v.id('organizations'),
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.id);
        const perms = getPermissions(user, membership);
        if (!perms.org.manage) throw new Error('Forbidden');

        const {id, ...updates} = args;
        await ctx.db.patch(id, {...updates, updatedAt: Date.now()});
    },
});

/**
 * Delete an organization and cascade to members & devices.
 * Requires org.manage permission.
 */
export const remove = mutation({
    args: {id: v.id('organizations')},
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.id);
        const perms = getPermissions(user, membership);
        if (!perms.org.manage) throw new Error('Forbidden');

        const memberships = await ctx.db
            .query('organizationMembers')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.id))
            .collect();
        for (const m of memberships) await ctx.db.delete(m._id);

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.id))
            .collect();
        for (const d of devices) await ctx.db.delete(d._id);

        await ctx.db.delete(args.id);
    },
});

// ============ Members ============

/**
 * Add a member to an organization.
 * Requires org.manage permission.
 */
export const addMember = mutation({
    args: {
        organizationId: v.id('organizations'),
        userId: v.id('users'),
        role: orgMemberRole,
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.org.manage) throw new Error('Forbidden');

        const existing = await getMembership(ctx, args.userId, args.organizationId);
        if (existing) throw new Error('Already a member');

        return ctx.db.insert('organizationMembers', {
            userId: args.userId,
            organizationId: args.organizationId,
            role: args.role,
            createdAt: Date.now(),
        });
    },
});

/**
 * Update a member's role.
 * Requires org.manage permission.
 */
export const updateMemberRole = mutation({
    args: {
        organizationId: v.id('organizations'),
        userId: v.id('users'),
        role: orgMemberRole,
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.org.manage) throw new Error('Forbidden');

        const targetMembership = await getMembership(ctx, args.userId, args.organizationId);
        if (!targetMembership) throw new Error('Member not found');

        await ctx.db.patch(targetMembership._id, {role: args.role});
    },
});

/**
 * Remove a member from an organization.
 * Requires org.manage permission.
 */
export const removeMember = mutation({
    args: {
        organizationId: v.id('organizations'),
        userId: v.id('users'),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.org.manage) throw new Error('Forbidden');

        const targetMembership = await getMembership(ctx, args.userId, args.organizationId);
        if (targetMembership) await ctx.db.delete(targetMembership._id);
    },
});

/**
 * List members of an organization.
 * Requires org.view permission.
 */
export const listMembers = query({
    args: {organizationId: v.id('organizations')},
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.org.view) return [];

        const memberships = await ctx.db
            .query('organizationMembers')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
            .collect();

        return Promise.all(
            memberships.map(async (m) => {
                const memberUser = await ctx.db.get(m.userId);
                return {
                    user: memberUser ? await withAvatarUrl(ctx, memberUser) : null,
                    role: m.role,
                };
            })
        );
    },
});

/**
 * List organizations a user belongs to with their role.
 */
export const listByUser = query({
    args: {userId: v.id('users')},
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        // Can only query own memberships unless appAdmin
        const perms = getPermissions(user, null);
        if (user._id !== args.userId && !perms.platform.setUserRoles) return [];

        const memberships = await ctx.db
            .query('organizationMembers')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();

        return Promise.all(
            memberships.map(async (m) => ({
                organization: await ctx.db.get(m.organizationId),
                role: m.role,
            }))
        );
    },
});