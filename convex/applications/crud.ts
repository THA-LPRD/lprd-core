import { internalQuery, mutation, type MutationCtx, query, type QueryCtx } from '../_generated/server';
import { getPermissions } from '../lib/acl';
import { isPluginApplication } from '../lib/applications';
import { applicationScope, applicationType, pluginTopic } from '../schema';
import { getCurrentActor } from '../actors';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

async function getApplicationPluginProfile(ctx: QueryCtx | MutationCtx, applicationId: Id<'applications'>) {
    return ctx.db
        .query('pluginProfiles')
        .withIndex('by_application', (q) => q.eq('applicationId', applicationId))
        .unique();
}

type ManageCtx = QueryCtx | MutationCtx;

async function requireManagingActor(ctx: ManageCtx) {
    const actor = await getCurrentActor(ctx);
    if (!actor) throw new Error('Not authenticated');

    const perms = getPermissions(actor, null);
    if (!perms.plugin.manage) throw new Error('Not authorized');

    return actor;
}

export const requireManager = internalQuery({
    args: {},
    handler: async (ctx) => requireManagingActor(ctx),
});

export const assertCanManage = query({
    args: {},
    handler: async (ctx) => {
        await requireManagingActor(ctx);
        return true;
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) return [];

        return ctx.db.query('applications').collect();
    },
});

export const getDetails = query({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) return null;

        const application = await ctx.db.get(args.id);
        if (!application) return null;

        const org = application.organizationId ? await ctx.db.get(application.organizationId) : null;

        return { ...application, organizationName: org?.name };
    },
});

export const getPluginProfile = query({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const perms = getPermissions(actor, null);
        if (!perms.plugin.manage) return null;

        return getApplicationPluginProfile(ctx, args.id);
    },
});

export const getById = internalQuery({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => ctx.db.get(args.id),
});

export const updateStatus = mutation({
    args: {
        id: v.id('applications'),
        status: v.union(v.literal('active'), v.literal('inactive'), v.literal('suspended'), v.literal('removed')),
    },
    handler: async (ctx, args) => {
        await requireManagingActor(ctx);

        const application = await ctx.db.get(args.id);
        if (!application) throw new Error('Application not found');

        await ctx.db.patch(args.id, {
            status: args.status,
            updatedAt: Date.now(),
        });
    },
});

export const createApplicationRecord = mutation({
    args: {
        actorName: v.string(),
        actorEmail: v.optional(v.string()),
        name: v.string(),
        description: v.optional(v.string()),
        type: applicationType,
        organizationId: v.id('organizations'),
        workosApplicationId: v.string(),
        workosClientId: v.string(),
        lastSecretHint: v.optional(v.string()),
        scopes: v.optional(v.array(applicationScope)),
        // Plugin-specific — required when type === 'plugin'
        plugin: v.optional(
            v.object({
                baseUrl: v.optional(v.string()),
                version: v.optional(v.string()),
                topics: v.optional(v.array(pluginTopic)),
                configSchema: v.optional(v.any()),
                healthCheckIntervalMs: v.optional(v.number()),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const actor = await requireManagingActor(ctx);

        const now = Date.now();

        const actorId = await ctx.db.insert('actors', {
            type: 'serviceAccount',
            organizationId: args.organizationId,
            email: args.actorEmail,
            name: args.actorName,
            status: 'active',
            role: 'user',
            createdAt: now,
            updatedAt: now,
        });

        const applicationId = await ctx.db.insert('applications', {
            actorId,
            name: args.name,
            description: args.description,
            type: args.type,
            status: 'active',
            organizationId: args.organizationId,
            workosApplicationId: args.workosApplicationId,
            workosClientId: args.workosClientId,
            lastSecretHint: args.lastSecretHint,
            scopes: args.scopes,
            createdBy: actor._id,
            createdAt: now,
            updatedAt: now,
        });

        if (isPluginApplication(args)) {
            await ctx.db.insert('pluginProfiles', {
                applicationId,
                baseUrl: args.plugin?.baseUrl ?? '',
                version: args.plugin?.version ?? '0.0.0',
                topics: args.plugin?.topics ?? [],
                configSchema: args.plugin?.configSchema,
                healthCheckIntervalMs: args.plugin?.healthCheckIntervalMs ?? 30_000,
                createdAt: now,
                updatedAt: now,
            });
        }

        return { actorId, applicationId };
    },
});

export const updateProvisionedCredentials = mutation({
    args: {
        id: v.id('applications'),
        lastSecretHint: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireManagingActor(ctx);

        const application = await ctx.db.get(args.id);
        if (!application) throw new Error('Application not found');

        await ctx.db.patch(args.id, {
            lastSecretHint: args.lastSecretHint,
            updatedAt: Date.now(),
        });
    },
});

export const getCredentialsTarget = query({
    args: { applicationId: v.id('applications') },
    handler: async (ctx, args) => {
        await requireManagingActor(ctx);

        const application = await ctx.db.get(args.applicationId);
        if (!application) return null;

        return {
            workosApplicationId: application.workosApplicationId,
            workosClientId: application.workosClientId,
        };
    },
});

export const getByWorkosClientId = internalQuery({
    args: { workosClientId: v.string() },
    handler: async (ctx, args) => {
        const application = await ctx.db
            .query('applications')
            .withIndex('by_workosClientId', (q) => q.eq('workosClientId', args.workosClientId))
            .unique();

        if (!application) return null;

        const actor = await ctx.db.get(application.actorId);
        return { application, actor };
    },
});

export const permanentDelete = mutation({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => {
        await requireManagingActor(ctx);

        const application = await ctx.db.get(args.id);
        if (!application) throw new Error('Application not found');
        if (application.status !== 'removed') throw new Error('Application must be removed before permanent deletion');

        const data = await ctx.db
            .query('pluginData')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .collect();
        for (const row of data) await ctx.db.delete(row._id);

        const access = await ctx.db
            .query('pluginSiteAccess')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .collect();
        for (const row of access) await ctx.db.delete(row._id);

        const checks = await ctx.db
            .query('pluginHealthChecks')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .collect();
        for (const row of checks) await ctx.db.delete(row._id);

        const templates = await ctx.db
            .query('templates')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .collect();
        for (const template of templates) {
            if (template.thumbnailStorageId) await ctx.storage.delete(template.thumbnailStorageId);
            await ctx.db.delete(template._id);
        }

        await ctx.db.delete(application.actorId);
        await ctx.db.delete(args.id);
    },
});
