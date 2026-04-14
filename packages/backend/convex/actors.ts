import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx, mutation, type QueryCtx, query } from './_generated/server';
import { requireAuthorization, requireSiteAuthorization, resolveAuthorization } from './lib/authz';
import {
    deletePermissionGrantsForActor,
    hasSubjectPermissionGrantOnTarget,
    listPermissionGrantRowsForSubject,
    replacePermissionGrantsForSourceTarget,
} from './lib/permissionGrants';
import { syncActorRolePermissionGrants } from './lib/permissionSync';
import { permissionCatalog } from './lib/permissions';
import { generateActorPublicId } from './lib/publicIds';
import { actorRole, actorType, applicationType } from './schema';

type Ctx = QueryCtx | MutationCtx;

async function tryGetActorById(ctx: Ctx, value: string) {
    try {
        return await ctx.db.get(value as Id<'actors'>);
    } catch {
        return null;
    }
}

async function getActorByExternalId(ctx: Ctx, externalId: string) {
    return ctx.db
        .query('actors')
        .withIndex('by_externalId', (q) => q.eq('externalId', externalId))
        .unique();
}

/**
 * Get current authenticated actor from context.
 * Returns null if not authenticated or actor not found.
 */
export async function getCurrentActor(ctx: Ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const externalId = identity.external_id;
    if (typeof externalId === 'string') {
        const actor = await tryGetActorById(ctx, externalId);
        if (actor) return actor;
    }

    const subject = identity.subject;

    const directActor = await tryGetActorById(ctx, subject);
    if (directActor) return directActor;

    const application = await ctx.db
        .query('applications')
        .withIndex('by_workosClientId', (q) => q.eq('workosClientId', subject))
        .unique();

    if (!application) return null;
    return ctx.db.get(application.actorId);
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
 * Get site actor attachment for an actor in a site.
 */
export async function getSiteActor(ctx: Ctx, actorId: Id<'actors'>, siteId: Id<'sites'>) {
    return ctx.db
        .query('siteActors')
        .withIndex('by_actor_and_site', (q) => q.eq('actorId', actorId).eq('siteId', siteId))
        .unique();
}

async function getActorOrganizationAvailability(ctx: Ctx, organizationId: Id<'organizations'>, actorId: Id<'actors'>) {
    const [canView, canInvite] = await Promise.all([
        hasSubjectPermissionGrantOnTarget(
            ctx,
            { subjectType: 'organization', subjectId: organizationId },
            permissionCatalog.org.actor.view,
            { targetType: 'actor', targetId: actorId },
        ),
        hasSubjectPermissionGrantOnTarget(
            ctx,
            { subjectType: 'organization', subjectId: organizationId },
            permissionCatalog.org.actor.invite,
            { targetType: 'actor', targetId: actorId },
        ),
    ]);

    return { canView, canInvite };
}

function decodeOffsetCursor(cursor: string | null): number {
    if (!cursor) return 0;

    const offset = Number.parseInt(cursor, 10);
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
}

function encodeOffsetCursor(offset: number): string {
    return String(offset);
}

async function getActorAvailabilityForSite(
    ctx: Ctx,
    site: Pick<Doc<'sites'>, '_id' | 'organizationId'>,
    actorId: Id<'actors'>,
) {
    const [[organizationCanView, siteCanView], [organizationCanInvite, siteCanInvite]] = await Promise.all([
        Promise.all([
            hasSubjectPermissionGrantOnTarget(
                ctx,
                { subjectType: 'organization', subjectId: site.organizationId },
                permissionCatalog.org.actor.view,
                { targetType: 'actor', targetId: actorId },
            ),
            hasSubjectPermissionGrantOnTarget(
                ctx,
                { subjectType: 'site', subjectId: site._id },
                permissionCatalog.org.actor.view,
                { targetType: 'actor', targetId: actorId },
            ),
        ]),
        Promise.all([
            hasSubjectPermissionGrantOnTarget(
                ctx,
                { subjectType: 'organization', subjectId: site.organizationId },
                permissionCatalog.org.actor.invite,
                { targetType: 'actor', targetId: actorId },
            ),
            hasSubjectPermissionGrantOnTarget(
                ctx,
                { subjectType: 'site', subjectId: site._id },
                permissionCatalog.org.actor.invite,
                { targetType: 'actor', targetId: actorId },
            ),
        ]),
    ]);

    return {
        canView: organizationCanView && siteCanView,
        canInvite: organizationCanInvite && siteCanInvite,
    };
}

export const upsertFromWebhook = internalMutation({
    args: {
        externalId: v.string(),
        organizationId: v.optional(v.id('organizations')),
        email: v.string(),
        name: v.optional(v.string()),
        avatarStorageId: v.optional(v.id('_storage')),
    },
    handler: async (ctx, args) => {
        const actor = await getActorByExternalId(ctx, args.externalId);
        const now = Date.now();

        if (actor) {
            const updates: Record<string, unknown> = {
                externalId: args.externalId,
                email: args.email,
                updatedAt: now,
            };
            if (args.organizationId !== undefined) updates.organizationId = args.organizationId;
            if (args.name !== undefined) updates.name = args.name;
            if (args.avatarStorageId !== undefined) updates.avatarStorageId = args.avatarStorageId;

            await ctx.db.patch(actor._id, updates);
            const nextActor = await ctx.db.get(actor._id);
            if (!nextActor) throw new Error('Actor not found after update');
            await syncActorRolePermissionGrants(ctx, nextActor);
            return actor._id;
        }

        const actorId = await ctx.db.insert('actors', {
            publicId: await generateActorPublicId(ctx),
            externalId: args.externalId,
            type: 'user',
            organizationId: args.organizationId,
            email: args.email,
            name: args.name,
            avatarStorageId: args.avatarStorageId,
            status: 'active',
            role: 'user',
            createdAt: now,
            updatedAt: now,
        });
        const nextActor = await ctx.db.get(actorId);
        if (!nextActor) throw new Error('Actor not found after create');
        await syncActorRolePermissionGrants(ctx, nextActor);
        return actorId;
    },
});

/**
 * Delete actor from WorkOS webhook (cascade to site actors).
 * Called when user.deleted event is received.
 */
export const deleteFromWebhook = internalMutation({
    args: {
        externalId: v.string(),
    },
    handler: async (ctx, args) => {
        const actor = await getActorByExternalId(ctx, args.externalId);

        if (!actor) return;

        const siteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_actor', (q) => q.eq('actorId', actor._id))
            .collect();

        for (const siteActor of siteActors) {
            await ctx.db.delete(siteActor._id);
        }

        const pendingInvites = await ctx.db
            .query('siteInvites')
            .withIndex('by_target_actor_and_status', (q) => q.eq('targetActorId', actor._id).eq('status', 'pending'))
            .collect();
        const now = Date.now();
        for (const invite of pendingInvites) {
            await ctx.db.patch(invite._id, {
                status: 'declined',
                respondedAt: now,
                updatedAt: now,
            });
        }

        const messages = await ctx.db
            .query('systemMessages')
            .withIndex('by_actor', (q) => q.eq('actorId', actor._id))
            .collect();
        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        await deletePermissionGrantsForActor(ctx, actor._id);
        await ctx.db.delete(actor._id);
    },
});

/**
 * Get current authenticated actor.
 */
export const me = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization) return null;
        return withAvatarUrl(ctx, authorization.actor);
    },
});

export const getMyActorSettings = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await requireAuthorization(ctx);
        const actor = await withAvatarUrl(ctx, authorization.actor);
        const availability = actor.organizationId
            ? await getActorOrganizationAvailability(ctx, actor.organizationId, actor._id)
            : { canView: false, canInvite: false };

        return {
            actor: {
                _id: actor._id,
                publicId: actor.publicId,
                name: actor.name,
                email: actor.email,
                avatarUrl: actor.avatarUrl,
            },
            canBeFoundInOrganization: availability.canView,
            canBeInvitedInOrganization: availability.canInvite,
        };
    },
});

/**
 * List all human actors.
 * Requires `platform.actor.manage`.
 */
export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization?.can(permissionCatalog.platform.actor.manage)) return [];

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

export const listForSiteSelection = query({
    args: {
        siteId: v.id('sites'),
        paginationOpts: paginationOptsValidator,
        filters: v.optional(
            v.object({
                actorType: v.optional(actorType),
                applicationType: v.optional(applicationType),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const authorization = await requireSiteAuthorization(ctx, args.siteId);
        if (!authorization.can(permissionCatalog.org.site.actor.manage)) {
            throw new Error('Forbidden');
        }

        const organizationRows = await listPermissionGrantRowsForSubject(ctx, {
            subjectType: 'organization',
            subjectId: authorization.site.organizationId,
        });
        const installedSiteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        const actorIds = new Set<Id<'actors'>>();

        for (const row of organizationRows) {
            if (row.permission === permissionCatalog.org.actor.view && row.targetType === 'actor') {
                actorIds.add(row.targetId as Id<'actors'>);
            }
        }

        for (const siteActor of installedSiteActors) {
            actorIds.add(siteActor.actorId as Id<'actors'>);
        }

        const rows = [];

        for (const actorId of [...actorIds].sort()) {
            const actor = await ctx.db.get(actorId);
            if (!actor) continue;

            if (args.filters?.actorType && actor.type !== args.filters.actorType) {
                continue;
            }

            const application =
                actor.type === 'serviceAccount'
                    ? await ctx.db
                          .query('applications')
                          .withIndex('by_actor', (q) => q.eq('actorId', actor._id))
                          .unique()
                    : null;

            if (args.filters?.applicationType) {
                if (!application || application.type !== args.filters.applicationType) {
                    continue;
                }
            }

            const installed = installedSiteActors.some((siteActor) => siteActor.actorId === actor._id);
            const availability = await getActorAvailabilityForSite(ctx, authorization.site, actor._id);

            if (!installed && !availability.canView) {
                continue;
            }

            rows.push({
                actor: {
                    _id: actor._id,
                    type: actor.type,
                    status: actor.status,
                    name: actor.name,
                    email: actor.email,
                },
                application: application
                    ? {
                          _id: application._id,
                          type: application.type,
                          status: application.status,
                          name: application.name,
                          description: application.description,
                      }
                    : null,
                installed,
                canView: availability.canView,
                canInvite: availability.canInvite,
            });
        }

        const offset = decodeOffsetCursor(args.paginationOpts.cursor);
        const end = offset + args.paginationOpts.numItems;
        const page = rows.slice(offset, end);

        return {
            page,
            isDone: end >= rows.length,
            continueCursor: encodeOffsetCursor(end),
        };
    },
});

export const updateActorSettings = mutation({
    args: {
        actorId: v.id('actors'),
        canBeFoundInOrganization: v.boolean(),
        canBeInvitedInOrganization: v.boolean(),
    },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        if (authorization.actor._id !== args.actorId && !authorization.can(permissionCatalog.platform.actor.manage)) {
            throw new Error('Forbidden');
        }

        const targetActor = await ctx.db.get(args.actorId);
        if (!targetActor) throw new Error('Actor not found');
        if (targetActor.type !== 'user') throw new Error('Only human users can manage these settings');
        if (!targetActor.organizationId) throw new Error('Organization required');

        await replacePermissionGrantsForSourceTarget(
            ctx,
            { subjectType: 'organization', subjectId: targetActor.organizationId },
            'manual',
            { targetType: 'actor', targetId: targetActor._id },
            [
                ...(args.canBeFoundInOrganization ? [permissionCatalog.org.actor.view] : []),
                ...(args.canBeInvitedInOrganization ? [permissionCatalog.org.actor.invite] : []),
            ],
        );
    },
});

/**
 * Set an actor's platform role.
 * Requires `platform.actor.manage`.
 */
export const setRole = mutation({
    args: {
        id: v.id('actors'),
        role: actorRole,
    },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        if (!authorization.can(permissionCatalog.platform.actor.manage)) {
            throw new Error('Forbidden');
        }

        await ctx.db.patch(args.id, { role: args.role, updatedAt: Date.now() });
        const actor = await ctx.db.get(args.id);
        if (!actor) throw new Error('Actor not found');
        await syncActorRolePermissionGrants(ctx, actor);
    },
});

/**
 * Set current actor's last visited site slug.
 * Used for auto-redirecting to last site.
 */
export const setLastSite = mutation({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);

        await ctx.db.patch(authorization.actor._id, { lastSiteSlug: args.slug, updatedAt: Date.now() });
    },
});
