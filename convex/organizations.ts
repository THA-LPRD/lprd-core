import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation, query } from './_generated/server';
import { resolveAuthorization } from './lib/authz';
import { listActorPermissionGrantRows } from './lib/permissionGrants';
import { normalizeStoredPermissionValue } from './lib/permissions';

async function listVisibleOrganizationIds(ctx: Parameters<typeof resolveAuthorization>[0], actorId: Id<'actors'>) {
    const grantRows = await listActorPermissionGrantRows(ctx, actorId);
    const organizationIds = new Set<Id<'organizations'>>();

    for (const row of grantRows) {
        const permission = normalizeStoredPermissionValue(row.permission);
        if (!permission || !permission.startsWith('org.')) continue;

        if (row.targetType === 'platform') {
            return null;
        }

        if (row.targetType === 'organization') {
            organizationIds.add(row.targetId as Id<'organizations'>);
        }
    }

    return organizationIds;
}

export const upsertFromWebhook = internalMutation({
    args: {
        externalId: v.string(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.externalId as Id<'organizations'>);

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                updatedAt: now,
            });
            return existing._id;
        } else {
            return await ctx.db.insert('organizations', {
                name: args.name,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

export const deleteFromWebhook = internalMutation({
    args: { externalId: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.externalId as Id<'organizations'>);

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const getById = query({
    args: { id: v.id('organizations') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization) return null;

        const visibleOrganizationIds = await listVisibleOrganizationIds(ctx, authorization.actor._id);
        if (visibleOrganizationIds === null || visibleOrganizationIds.has(args.id)) {
            return ctx.db.get(args.id);
        }

        return null;
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization) return [];

        const visibleOrganizationIds = await listVisibleOrganizationIds(ctx, authorization.actor._id);
        if (visibleOrganizationIds === null) {
            return ctx.db.query('organizations').collect();
        }

        if (visibleOrganizationIds.size === 0) {
            return [];
        }

        const organizations = await Promise.all(
            [...visibleOrganizationIds].map((organizationId) => ctx.db.get(organizationId)),
        );

        return organizations.filter((organization) => organization !== null);
    },
});
