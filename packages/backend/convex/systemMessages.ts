import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, type MutationCtx, query } from './_generated/server';
import { requireAuthorization } from './lib/authz';
import { permissionCatalog } from './lib/permissions';
import { systemMessageFolder } from './schema';

async function requireActorMessage(ctx: MutationCtx, actorId: Id<'actors'>, messageId: Id<'systemMessages'>) {
    const authorization = await requireAuthorization(ctx);
    if (authorization.actor._id !== actorId && !authorization.can(permissionCatalog.platform.actor.manage)) {
        throw new Error('Forbidden');
    }

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error('Message not found');
    if (message.actorId !== actorId) throw new Error('Forbidden');
    return { authorization, message };
}

export const listMine = query({
    args: { folder: systemMessageFolder },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        const messages = await ctx.db
            .query('systemMessages')
            .withIndex('by_actor_and_folder', (q) => q.eq('actorId', authorization.actor._id).eq('folder', args.folder))
            .order('desc')
            .take(100);

        return Promise.all(
            messages.map(async (message) => {
                if (message.type !== 'siteInvite' || message.refTable !== 'siteInvites' || !message.refId) {
                    return {
                        message,
                        siteInvite: null,
                        site: null,
                        invitedByActor: null,
                    };
                }

                const invite = await ctx.db.get(message.refId as Id<'siteInvites'>);
                const [site, invitedByActor] = await Promise.all([
                    invite ? ctx.db.get(invite.siteId) : null,
                    invite?.invitedByActorId ? ctx.db.get(invite.invitedByActorId) : null,
                ]);

                return {
                    message,
                    siteInvite: invite,
                    site: site
                        ? {
                              _id: site._id,
                              name: site.name,
                              slug: site.slug,
                          }
                        : null,
                    invitedByActor: invitedByActor ? { name: invitedByActor.name } : null,
                };
            }),
        );
    },
});

export const getMineById = query({
    args: { messageId: v.id('systemMessages') },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        const message = await ctx.db.get(args.messageId);
        if (!message || message.actorId !== authorization.actor._id) return null;

        if (message.type !== 'siteInvite' || message.refTable !== 'siteInvites' || !message.refId) {
            return {
                message,
                siteInvite: null,
                site: null,
                invitedByActor: null,
            };
        }

        const invite = await ctx.db.get(message.refId as Id<'siteInvites'>);
        const [site, invitedByActor] = await Promise.all([
            invite ? ctx.db.get(invite.siteId) : null,
            invite?.invitedByActorId ? ctx.db.get(invite.invitedByActorId) : null,
        ]);

        return {
            message,
            siteInvite: invite,
            site: site
                ? {
                      _id: site._id,
                      name: site.name,
                      slug: site.slug,
                  }
                : null,
            invitedByActor: invitedByActor ? { name: invitedByActor.name } : null,
        };
    },
});

export const markRead = mutation({
    args: { actorId: v.id('actors'), messageId: v.id('systemMessages') },
    handler: async (ctx, args) => {
        const { message } = await requireActorMessage(ctx, args.actorId, args.messageId);
        if (message.readAt) return;

        const now = Date.now();
        await ctx.db.patch(message._id, { readAt: now, updatedAt: now });
    },
});

export const moveToArchive = mutation({
    args: { actorId: v.id('actors'), messageId: v.id('systemMessages') },
    handler: async (ctx, args) => {
        const { message } = await requireActorMessage(ctx, args.actorId, args.messageId);
        const now = Date.now();
        await ctx.db.patch(message._id, {
            folder: 'archive',
            archivedAt: now,
            updatedAt: now,
        });
    },
});

export const moveToInbox = mutation({
    args: { actorId: v.id('actors'), messageId: v.id('systemMessages') },
    handler: async (ctx, args) => {
        const { message } = await requireActorMessage(ctx, args.actorId, args.messageId);
        await ctx.db.patch(message._id, {
            folder: 'inbox',
            updatedAt: Date.now(),
        });
    },
});

export const moveToDeleted = mutation({
    args: { actorId: v.id('actors'), messageId: v.id('systemMessages') },
    handler: async (ctx, args) => {
        const { message } = await requireActorMessage(ctx, args.actorId, args.messageId);
        const now = Date.now();
        await ctx.db.patch(message._id, {
            folder: 'deleted',
            deletedAt: now,
            updatedAt: now,
        });
    },
});

export const deleteForever = mutation({
    args: { actorId: v.id('actors'), messageId: v.id('systemMessages') },
    handler: async (ctx, args) => {
        const { message } = await requireActorMessage(ctx, args.actorId, args.messageId);
        if (message.folder !== 'deleted') throw new Error('Message must be in deleted before permanent deletion');
        await ctx.db.delete(message._id);
    },
});
