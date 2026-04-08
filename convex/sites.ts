import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { permissionCatalog } from './lib/permissions';
import { requirePermission, resolveAuthorization } from './lib/authz';
import { generateSitePublicId } from './lib/publicIds';
import { deletePermissionGrantsForTarget } from './lib/permissionGrants';
import { removeSiteActorPermissionGrants, syncSiteActorPermissionGrants } from './lib/permissionSync';

/**
 * Create a new site.
 * Requires `org.site.create`.
 * The creator is attached as a site actor with the `siteAdmin` role.
 */
export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const authorization = await requirePermission(ctx, permissionCatalog.org.site.create);
        const { actor, organizationId } = authorization;
        if (!organizationId) throw new Error('Organization required');

        const existing = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .unique();
        if (existing) throw new Error('Slug already exists');

        const now = Date.now();
        const siteId = await ctx.db.insert('sites', {
            publicId: await generateSitePublicId(ctx),
            organizationId,
            name: args.name,
            slug: args.slug,
            logoUrl: args.logoUrl,
            createdAt: now,
            updatedAt: now,
        });

        // Seed the creator as the first site admin.
        const siteActorId = await ctx.db.insert('siteActors', {
            actorId: actor._id as Id<'actors'>,
            siteId,
            role: 'siteAdmin',
            createdAt: now,
        });
        const siteActor = await ctx.db.get(siteActorId);
        if (!siteActor) throw new Error('Site actor not found after create');
        await syncSiteActorPermissionGrants(ctx, siteActor);

        return siteId;
    },
});

/**
 * List sites the current actor can see.
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization) return [];

        if (authorization.can(permissionCatalog.platform.actor.manage)) {
            return ctx.db.query('sites').collect();
        }

        const organizationId = authorization.organizationId;
        if (organizationId && authorization.can(permissionCatalog.org.site.view)) {
            return ctx.db
                .query('sites')
                .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
                .collect();
        }

        // Others see only their site attachments
        const siteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_actor', (q) => q.eq('actorId', authorization.actor._id as Id<'actors'>))
            .collect();

        const sites = await Promise.all(siteActors.map((siteActor) => ctx.db.get(siteActor.siteId)));
        return sites.filter((site) => site !== null);
    },
});

/**
 * Get a site by ID.
 */
export const getById = query({
    args: { id: v.id('sites') },
    handler: async (ctx, args) => {
        const site = await ctx.db.get(args.id);
        if (!site) return null;

        const authorization = await resolveAuthorization(ctx, { siteId: args.id });
        if (!authorization?.can(permissionCatalog.org.site.view)) return null;

        return site;
    },
});

/**
 * Get a site by slug.
 */
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const site = await ctx.db
            .query('sites')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .unique();
        if (!site) return null;

        const authorization = await resolveAuthorization(ctx, { siteId: site._id });
        if (!authorization?.can(permissionCatalog.org.site.view)) return null;

        return site;
    },
});

/**
 * Update a site.
 * Requires `org.site.manage`.
 */
export const update = mutation({
    args: {
        id: v.id('sites'),
        name: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requirePermission(ctx, permissionCatalog.org.site.manage, { siteId: args.id });

        const { id, ...updates } = args;
        await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    },
});

/**
 * Delete a site and cascade to site actors, devices, and site-target grants.
 * Requires `org.site.manage`.
 */
export const remove = mutation({
    args: { id: v.id('sites') },
    handler: async (ctx, args) => {
        await requirePermission(ctx, permissionCatalog.org.site.manage, { siteId: args.id });

        const siteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_site', (q) => q.eq('siteId', args.id))
            .collect();
        for (const siteActor of siteActors) {
            await removeSiteActorPermissionGrants(ctx, siteActor);
            await ctx.db.delete(siteActor._id);
        }

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_site', (q) => q.eq('siteId', args.id))
            .collect();
        for (const d of devices) await ctx.db.delete(d._id);

        await deletePermissionGrantsForTarget(ctx, { targetType: 'site', targetId: args.id });
        await ctx.db.delete(args.id);
    },
});
