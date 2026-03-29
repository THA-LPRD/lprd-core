import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { siteMemberRole } from './schema';
import { getPermissions } from './lib/acl';
import { getCurrentActor, getMembership, withAvatarUrl } from './actors';

/**
 * Create a new site.
 * Any authenticated actor can create. Creator becomes siteAdmin.
 */
export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const perms = getPermissions(actor, null);
        if (!perms.site.create) throw new Error('Forbidden');

        const existing = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .unique();
        if (existing) throw new Error('Slug already exists');

        const now = Date.now();
        const siteId = await ctx.db.insert('sites', {
            name: args.name,
            slug: args.slug,
            logoUrl: args.logoUrl,
            createdAt: now,
            updatedAt: now,
        });

        // Creator becomes siteAdmin
        await ctx.db.insert('siteMembers', {
            actorId: actor._id as Id<'actors'>,
            siteId,
            role: 'siteAdmin',
            createdAt: now,
        });

        return siteId;
    },
});

/**
 * List sites the current actor can see.
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        // appAdmins can view all sites (check with null membership)
        const globalPerms = getPermissions(actor, null);
        if (globalPerms.site.view) {
            return ctx.db.query('sites').collect();
        }

        // Others see only their memberships
        const memberships = await ctx.db
            .query('siteMembers')
            .withIndex('by_actor', (q) => q.eq('actorId', actor._id as Id<'actors'>))
            .collect();

        const sites = await Promise.all(memberships.map((m) => ctx.db.get(m.siteId)));
        return sites.filter((site) => site !== null);
    },
});

/**
 * Get a site by ID.
 */
export const getById = query({
    args: { id: v.id('sites') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const site = await ctx.db.get(args.id);
        if (!site) return null;

        const membership = await getMembership(ctx, actor._id, args.id);
        const perms = getPermissions(actor, membership);
        if (!perms.site.view) return null;

        return site;
    },
});

/**
 * Get a site by slug.
 */
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const site = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .unique();
        if (!site) return null;

        const membership = await getMembership(ctx, actor._id, site._id);
        const perms = getPermissions(actor, membership);
        if (!perms.site.view) return null;

        return site;
    },
});

/**
 * Update a site.
 * Requires site.manage permission.
 */
export const update = mutation({
    args: {
        id: v.id('sites'),
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.id);
        const perms = getPermissions(actor, membership);
        if (!perms.site.manage) throw new Error('Forbidden');

        const { id, ...updates } = args;
        await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    },
});

/**
 * Delete a site and cascade to members & devices.
 * Requires site.manage permission.
 */
export const remove = mutation({
    args: { id: v.id('sites') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.id);
        const perms = getPermissions(actor, membership);
        if (!perms.site.manage) throw new Error('Forbidden');

        const memberships = await ctx.db
            .query('siteMembers')
            .withIndex('by_site', (q) => q.eq('siteId', args.id))
            .collect();
        for (const m of memberships) await ctx.db.delete(m._id);

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_site', (q) => q.eq('siteId', args.id))
            .collect();
        for (const d of devices) await ctx.db.delete(d._id);

        await ctx.db.delete(args.id);
    },
});

// ============ Members ============

/**
 * Add a member to a site.
 * Requires site.manage permission.
 */
export const addMember = mutation({
    args: {
        siteId: v.id('sites'),
        actorId: v.id('actors'),
        role: siteMemberRole,
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.site.manage) throw new Error('Forbidden');

        const existing = await getMembership(ctx, args.actorId, args.siteId);
        if (existing) throw new Error('Already a member');

        return ctx.db.insert('siteMembers', {
            actorId: args.actorId,
            siteId: args.siteId,
            role: args.role,
            createdAt: Date.now(),
        });
    },
});

/**
 * Update a member's role.
 * Requires site.manage permission.
 */
export const updateMemberRole = mutation({
    args: {
        siteId: v.id('sites'),
        actorId: v.id('actors'),
        role: siteMemberRole,
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.site.manage) throw new Error('Forbidden');

        const targetMembership = await getMembership(ctx, args.actorId, args.siteId);
        if (!targetMembership) throw new Error('Member not found');

        await ctx.db.patch(targetMembership._id, { role: args.role });
    },
});

/**
 * Remove a member from a site.
 * Requires site.manage permission.
 */
export const removeMember = mutation({
    args: {
        siteId: v.id('sites'),
        actorId: v.id('actors'),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.site.manage) throw new Error('Forbidden');

        const targetMembership = await getMembership(ctx, args.actorId, args.siteId);
        if (targetMembership) await ctx.db.delete(targetMembership._id);
    },
});

/**
 * List members of a site.
 * Requires site.view permission.
 */
export const listMembers = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.site.view) return [];

        const memberships = await ctx.db
            .query('siteMembers')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        return Promise.all(
            memberships.map(async (m) => {
                const actorId = m.actorId as Id<'actors'>;
                const memberActor = await ctx.db.get(actorId);
                const memberWithAvatar = memberActor ? await withAvatarUrl(ctx, memberActor) : null;
                return {
                    actor: memberWithAvatar
                        ? {
                              _id: actorId,
                              name: memberWithAvatar.name,
                              email: memberWithAvatar.email,
                              avatarUrl: memberWithAvatar.avatarUrl,
                          }
                        : null,
                    role: m.role,
                };
            }),
        );
    },
});

/**
 * List sites an actor belongs to with their role.
 */
export const listByActor = query({
    args: { actorId: v.id('actors') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        // Can only query own memberships unless appAdmin
        const perms = getPermissions(actor, null);
        if ((actor._id as string) !== (args.actorId as string) && !perms.platform.setUserRoles) return [];

        const memberships = await ctx.db
            .query('siteMembers')
            .withIndex('by_actor', (q) => q.eq('actorId', args.actorId))
            .collect();

        return Promise.all(
            memberships.map(async (m) => ({
                site: await ctx.db.get(m.siteId),
                role: m.role,
            })),
        );
    },
});
