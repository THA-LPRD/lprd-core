import { v } from 'convex/values';
import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, type MutationCtx, query, type QueryCtx } from './_generated/server';
import { getSiteActor, withAvatarUrl } from './actors';
import type { PermissionGrantSubjectId, PermissionGrantSubjectType } from './lib/permissions';
import { permissionCatalog } from './lib/permissions';
import { hasSubjectPermissionGrantOnTarget, replacePermissionGrantsForSourceTarget } from './lib/permissionGrants';
import { requireAuthorization, requireSiteAuthorization, resolveAuthorization } from './lib/authz';
import { removeSiteActorPermissionGrants, syncSiteActorPermissionGrants } from './lib/permissionSync';
import { siteActorRole } from './schema';

type Ctx = QueryCtx | MutationCtx;

async function getActorScopeAvailability(
    ctx: Ctx,
    subject: {
        subjectType: PermissionGrantSubjectType;
        subjectId: PermissionGrantSubjectId;
    },
    actorId: Id<'actors'>,
) {
    const [canView, canInvite] = await Promise.all([
        hasSubjectPermissionGrantOnTarget(ctx, subject, permissionCatalog.org.actor.view, {
            targetType: 'actor',
            targetId: actorId,
        }),
        hasSubjectPermissionGrantOnTarget(ctx, subject, permissionCatalog.org.actor.invite, {
            targetType: 'actor',
            targetId: actorId,
        }),
    ]);

    return { canView, canInvite };
}

async function getActorAvailabilityForSite(
    ctx: Ctx,
    site: Pick<Doc<'sites'>, '_id' | 'organizationId'>,
    actorId: Id<'actors'>,
) {
    const [organizationAvailability, siteAvailability] = await Promise.all([
        getActorScopeAvailability(ctx, { subjectType: 'organization', subjectId: site.organizationId }, actorId),
        getActorScopeAvailability(ctx, { subjectType: 'site', subjectId: site._id }, actorId),
    ]);

    return {
        canView: organizationAvailability.canView && siteAvailability.canView,
        canInvite: organizationAvailability.canInvite && siteAvailability.canInvite,
    };
}

async function listVisibleSites(ctx: QueryCtx) {
    const authorization = await resolveAuthorization(ctx);
    if (!authorization) return [];

    if (authorization.can(permissionCatalog.platform.actor.manage)) {
        return ctx.db.query('sites').collect();
    }

    if (!authorization.can(permissionCatalog.org.actor.serviceAccount.manage) || !authorization.organizationId) {
        return [];
    }

    return ctx.db
        .query('sites')
        .withIndex('by_organization', (q) => q.eq('organizationId', authorization.organizationId!))
        .collect();
}

export const attachActor = mutation({
    args: {
        siteId: v.id('sites'),
        actorId: v.id('actors'),
        role: v.optional(siteActorRole),
    },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const actor = await ctx.db.get(args.actorId);
        if (!actor) throw new Error('Actor not found');

        if (actor.type === 'user') {
            throw new Error('Human users must be invited before they can join a site');
        } else if (args.role) {
            throw new Error('Only human actors can be assigned a site role');
        }

        const existing = await getSiteActor(ctx, args.actorId, args.siteId);
        if (existing) {
            if (existing.role) {
                throw new Error('Non-human site actors cannot have a role');
            }

            return existing._id;
        }

        const availability = await getActorAvailabilityForSite(ctx, authorization.site, args.actorId);
        if (!availability.canInvite) {
            throw new Error('Actor cannot be added to this site');
        }

        const siteActorId = await ctx.db.insert('siteActors', {
            actorId: args.actorId,
            siteId: args.siteId,
            role: args.role,
            createdAt: Date.now(),
        });
        const siteActor = await ctx.db.get(siteActorId);
        if (!siteActor) throw new Error('Site actor not found after create');
        await syncSiteActorPermissionGrants(ctx, siteActor);

        return siteActorId;
    },
});

export const removeActor = mutation({
    args: {
        siteId: v.id('sites'),
        actorId: v.id('actors'),
    },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const targetSiteActor = await getSiteActor(ctx, args.actorId, args.siteId);
        if (!targetSiteActor) return;

        await removeSiteActorPermissionGrants(ctx, targetSiteActor);
        await ctx.db.delete(targetSiteActor._id);
    },
});

export const updateMemberRole = mutation({
    args: {
        siteId: v.id('sites'),
        actorId: v.id('actors'),
        role: siteActorRole,
    },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const targetSiteActor = await getSiteActor(ctx, args.actorId, args.siteId);
        if (!targetSiteActor?.role) throw new Error('Member not found');

        await ctx.db.patch(targetSiteActor._id, { role: args.role });
        const nextSiteActor = await ctx.db.get(targetSiteActor._id);
        if (!nextSiteActor) throw new Error('Site actor not found after update');
        await syncSiteActorPermissionGrants(ctx, nextSiteActor);
    },
});

export const listBySite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.view)) return [];

        const siteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        const members = await Promise.all(
            siteActors
                .filter((siteActor) => siteActor.role)
                .map(async (siteActor) => {
                    const memberActor = await ctx.db.get(siteActor.actorId);
                    if (!memberActor || memberActor.type !== 'user') return null;

                    const memberWithAvatar = await withAvatarUrl(ctx, memberActor);
                    return {
                        actor: {
                            _id: memberActor._id,
                            publicId: memberActor.publicId,
                            name: memberWithAvatar.name,
                            avatarUrl: memberWithAvatar.avatarUrl,
                        },
                        role: siteActor.role!,
                    };
                }),
        );

        return members.filter((member) => member !== null);
    },
});

export const listByActor = query({
    args: { actorId: v.id('actors') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization) return [];

        if (
            (authorization.actor._id as string) !== (args.actorId as string) &&
            !authorization.can(permissionCatalog.platform.actor.manage)
        ) {
            return [];
        }

        const siteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_actor', (q) => q.eq('actorId', args.actorId))
            .collect();

        return Promise.all(
            siteActors.map(async (siteActor) => ({
                site: await ctx.db.get(siteActor.siteId),
                role: siteActor.role ?? null,
            })),
        );
    },
});

export const getOrganizationAvailability = query({
    args: { actorId: v.id('actors') },
    handler: async (
        ctx,
        args,
    ): Promise<Array<{ _id: Id<'organizations'>; name: string; canView: boolean; canInvite: boolean }>> => {
        const authorization = await requireAuthorization(ctx);
        if (
            !authorization.can(permissionCatalog.platform.actor.manage) &&
            !authorization.can(permissionCatalog.org.actor.serviceAccount.manage)
        ) {
            throw new Error('Forbidden');
        }

        const organizations: Doc<'organizations'>[] = await ctx.runQuery(api.organizations.list, {});
        const rows = [];

        for (const organization of organizations) {
            const availability = await getActorScopeAvailability(
                ctx,
                { subjectType: 'organization', subjectId: organization._id },
                args.actorId,
            );

            rows.push({
                _id: organization._id,
                name: organization.name,
                canView: availability.canView,
                canInvite: availability.canInvite,
            });
        }

        return rows;
    },
});

export const getSiteAvailability = query({
    args: { actorId: v.id('actors') },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        if (
            !authorization.can(permissionCatalog.platform.actor.manage) &&
            !authorization.can(permissionCatalog.org.actor.serviceAccount.manage)
        ) {
            throw new Error('Forbidden');
        }

        const sites = await listVisibleSites(ctx);
        const rows = [];

        for (const site of sites) {
            const availability = await getActorScopeAvailability(
                ctx,
                { subjectType: 'site', subjectId: site._id },
                args.actorId,
            );

            rows.push({
                _id: site._id,
                name: site.name,
                slug: site.slug,
                canView: availability.canView,
                canInvite: availability.canInvite,
            });
        }

        return rows;
    },
});

export const setOrganizationAvailability = mutation({
    args: {
        actorId: v.id('actors'),
        organizationId: v.id('organizations'),
        canView: v.boolean(),
        canInvite: v.boolean(),
    },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { organizationId: args.organizationId });
        if (
            !authorization?.can(permissionCatalog.platform.actor.manage) &&
            !authorization?.can(permissionCatalog.org.actor.serviceAccount.manage)
        ) {
            throw new Error('Forbidden');
        }

        const actor = await ctx.db.get(args.actorId);
        if (!actor) throw new Error('Actor not found');

        const organization = await ctx.db.get(args.organizationId);
        if (!organization) throw new Error('Organization not found');

        await replacePermissionGrantsForSourceTarget(
            ctx,
            { subjectType: 'organization', subjectId: args.organizationId },
            'manual',
            { targetType: 'actor', targetId: args.actorId },
            [
                ...(args.canView ? [permissionCatalog.org.actor.view] : []),
                ...(args.canInvite ? [permissionCatalog.org.actor.invite] : []),
            ],
        );
    },
});

export const setSiteAvailability = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.id('sites'),
        canView: v.boolean(),
        canInvite: v.boolean(),
    },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (
            !authorization.can(permissionCatalog.platform.actor.manage) &&
            !authorization.can(permissionCatalog.org.actor.serviceAccount.manage)
        ) {
            throw new Error('Forbidden');
        }

        const actor = await ctx.db.get(args.actorId);
        if (!actor) throw new Error('Actor not found');

        await replacePermissionGrantsForSourceTarget(
            ctx,
            { subjectType: 'site', subjectId: args.siteId },
            'manual',
            { targetType: 'actor', targetId: args.actorId },
            [
                ...(args.canView ? [permissionCatalog.org.actor.view] : []),
                ...(args.canInvite ? [permissionCatalog.org.actor.invite] : []),
            ],
        );
    },
});

export const checkMySiteAccessByPublicId = query({
    args: { sitePublicId: v.string() },
    handler: async (ctx, args) => {
        const site = await ctx.db
            .query('sites')
            .withIndex('by_publicId', (q) => q.eq('publicId', args.sitePublicId))
            .unique();
        if (!site) return false;

        const authorization = await resolveAuthorization(ctx, { siteId: site._id });
        if (!authorization?.application || authorization.application.status !== 'active') return false;

        return authorization.can(permissionCatalog.org.site.pluginData.manage.self);
    },
});
