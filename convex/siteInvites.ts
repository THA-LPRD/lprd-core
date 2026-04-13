import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, type MutationCtx, query, type QueryCtx } from './_generated/server';
import { getSiteActor, withAvatarUrl } from './actors';
import { permissionCatalog } from './lib/permissions';
import { hasSubjectPermissionGrantOnTarget } from './lib/permissionGrants';
import { requireAuthorization, requireSiteAuthorization } from './lib/authz';
import { syncSiteActorPermissionGrants } from './lib/permissionSync';

type Ctx = QueryCtx | MutationCtx;

async function getPendingInvite(ctx: Ctx, siteId: Id<'sites'>, targetActorId: Id<'actors'>) {
    const invites = await ctx.db
        .query('siteInvites')
        .withIndex('by_site_and_target_actor_and_status', (q) =>
            q.eq('siteId', siteId).eq('targetActorId', targetActorId).eq('status', 'pending'),
        )
        .take(1);

    return invites[0] ?? null;
}

async function actorCanBeInvitedByOrganization(ctx: Ctx, organizationId: Id<'organizations'>, actorId: Id<'actors'>) {
    return hasSubjectPermissionGrantOnTarget(
        ctx,
        { subjectType: 'organization', subjectId: organizationId },
        permissionCatalog.org.actor.invite,
        { targetType: 'actor', targetId: actorId },
    );
}

async function requirePendingInvite(ctx: Ctx, inviteId: Id<'siteInvites'>) {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error('Invite not found');
    if (invite.status !== 'pending') throw new Error('Invite is no longer pending');
    return invite;
}

async function markLinkedMessageRead(ctx: MutationCtx, invite: Doc<'siteInvites'>, now: number) {
    if (!invite.messageId) return;
    const message = await ctx.db.get(invite.messageId);
    if (!message) return;
    await ctx.db.patch(message._id, {
        readAt: message.readAt ?? now,
        updatedAt: now,
    });
}

export const listForSite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const invites = await ctx.db
            .query('siteInvites')
            .withIndex('by_site_and_status', (q) => q.eq('siteId', args.siteId).eq('status', 'pending'))
            .order('desc')
            .take(100);

        return Promise.all(
            invites.map(async (invite) => {
                const [targetActor, invitedByActor] = await Promise.all([
                    ctx.db.get(invite.targetActorId),
                    invite.invitedByActorId ? ctx.db.get(invite.invitedByActorId) : null,
                ]);
                const targetWithAvatar = targetActor ? await withAvatarUrl(ctx, targetActor) : null;

                return {
                    invite,
                    targetActor: targetWithAvatar
                        ? {
                              _id: targetWithAvatar._id,
                              publicId: targetWithAvatar.publicId,
                              name: targetWithAvatar.name,
                              avatarUrl: targetWithAvatar.avatarUrl,
                          }
                        : null,
                    invitedByActor: invitedByActor ? { name: invitedByActor.name } : null,
                };
            }),
        );
    },
});

export const createByPublicId = mutation({
    args: {
        siteId: v.id('sites'),
        actorPublicId: v.string(),
    },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const actorPublicId = args.actorPublicId.trim();
        if (!actorPublicId) throw new Error('Public ID is required');

        const targetActor = await ctx.db
            .query('actors')
            .withIndex('by_publicId', (q) => q.eq('publicId', actorPublicId))
            .unique();
        if (!targetActor) throw new Error('Actor not found');
        if (targetActor.type !== 'user') throw new Error('Only human users can be invited');
        if (targetActor.status !== 'active') throw new Error('Actor is not active');
        if (targetActor.organizationId !== authorization.site.organizationId) {
            throw new Error('Actor is not part of this organization');
        }

        const existingMember = await getSiteActor(ctx, targetActor._id, args.siteId);
        if (existingMember) throw new Error('Actor is already a member');

        const canInvite = await actorCanBeInvitedByOrganization(
            ctx,
            authorization.site.organizationId,
            targetActor._id,
        );
        if (!canInvite) throw new Error('Actor cannot receive site invites');

        const existingInvite = await getPendingInvite(ctx, args.siteId, targetActor._id);
        if (existingInvite) return existingInvite._id;

        const now = Date.now();
        const siteName = authorization.site.name;
        const inviteId = await ctx.db.insert('siteInvites', {
            siteId: args.siteId,
            organizationId: authorization.site.organizationId,
            targetActorId: targetActor._id,
            invitedByActorId: authorization.actor._id,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });
        const messageId = await ctx.db.insert('systemMessages', {
            actorId: targetActor._id,
            type: 'siteInvite',
            folder: 'inbox',
            title: `Invite to ${siteName}`,
            body: `You were invited to join ${siteName}.`,
            refTable: 'siteInvites',
            refId: inviteId,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.db.patch(inviteId, { messageId, updatedAt: now });
        return inviteId;
    },
});

export const revoke = mutation({
    args: { siteId: v.id('sites'), inviteId: v.id('siteInvites') },
    handler: async (ctx, args) => {
        const invite = await requirePendingInvite(ctx, args.inviteId);
        if (invite.siteId !== args.siteId) throw new Error('Invite does not belong to this site');

        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const now = Date.now();
        await ctx.db.patch(invite._id, {
            status: 'revoked',
            revokedAt: now,
            updatedAt: now,
        });
    },
});

export const accept = mutation({
    args: { siteId: v.id('sites'), inviteId: v.id('siteInvites') },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        const invite = await requirePendingInvite(ctx, args.inviteId);
        if (invite.siteId !== args.siteId) throw new Error('Invite does not belong to this site');
        if (invite.targetActorId !== authorization.actor._id) throw new Error('Forbidden');

        const site = await ctx.db.get(args.siteId);
        if (!site) throw new Error('Site no longer exists');

        const existingMember = await getSiteActor(ctx, authorization.actor._id, args.siteId);
        if (existingMember) throw new Error('Actor is already a member');

        const now = Date.now();
        const siteActorId = await ctx.db.insert('siteActors', {
            actorId: authorization.actor._id,
            siteId: args.siteId,
            role: 'user',
            createdAt: now,
        });
        const siteActor = await ctx.db.get(siteActorId);
        if (!siteActor) throw new Error('Site actor not found after create');
        await syncSiteActorPermissionGrants(ctx, siteActor);

        await ctx.db.patch(invite._id, {
            status: 'accepted',
            respondedAt: now,
            updatedAt: now,
        });
        await markLinkedMessageRead(ctx, invite, now);

        return siteActorId;
    },
});

export const decline = mutation({
    args: { siteId: v.id('sites'), inviteId: v.id('siteInvites') },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        const invite = await requirePendingInvite(ctx, args.inviteId);
        if (invite.siteId !== args.siteId) throw new Error('Invite does not belong to this site');
        if (invite.targetActorId !== authorization.actor._id) throw new Error('Forbidden');

        const now = Date.now();
        await ctx.db.patch(invite._id, {
            status: 'declined',
            respondedAt: now,
            updatedAt: now,
        });
        await markLinkedMessageRead(ctx, invite, now);
    },
});
