import { internalQuery, mutation, query } from '../_generated/server';
import { permissionCatalog } from '../lib/permissions';
import { isPluginApplication } from '../lib/applications';
import { applicationPermission, applicationType, pluginTopic } from '../schema';
import { requireAuthorization, resolveAuthorization } from '../lib/authz';
import { v } from 'convex/values';
import {
    deletePermissionGrantsForActor,
    listActorPermissionGrantRows,
    normalizePermissionGrantRows,
} from '../lib/permissionGrants';
import { syncApplicationPermissionGrants } from '../lib/permissionSync';

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization?.can(permissionCatalog.org.actor.serviceAccount.manage)) return [];

        const applications = await ctx.db.query('applications').collect();
        return Promise.all(
            applications.map(async (application) => {
                const grants = await listActorPermissionGrantRows(ctx, application.actorId);
                return { ...application, permissions: normalizePermissionGrantRows(grants) };
            }),
        );
    },
});

export const getDetails = query({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization?.can(permissionCatalog.org.actor.serviceAccount.manage)) return null;

        const application = await ctx.db.get(args.id);
        if (!application) return null;

        const org = application.organizationId ? await ctx.db.get(application.organizationId) : null;
        const grants = await listActorPermissionGrantRows(ctx, application.actorId);

        return { ...application, permissions: normalizePermissionGrantRows(grants), organizationName: org?.name };
    },
});

export const getPluginProfile = query({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx);
        if (!authorization?.can(permissionCatalog.org.actor.serviceAccount.manage)) return null;

        return ctx.db
            .query('pluginProfiles')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .unique();
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
        const authorization = await requireAuthorization(ctx);
        if (!authorization.can(permissionCatalog.org.actor.serviceAccount.manage)) {
            throw new Error('Not authorized');
        }

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
        permissions: v.optional(v.array(applicationPermission)),
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
        const authorization = await requireAuthorization(ctx);
        if (!authorization.can(permissionCatalog.org.actor.serviceAccount.manage)) {
            throw new Error('Not authorized');
        }

        const actor = authorization.actor;

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

        const application = await ctx.db.get(applicationId);
        if (!application) throw new Error('Application not found after create');
        await syncApplicationPermissionGrants(ctx, application, args.permissions);

        return { actorId, applicationId };
    },
});

export const updateProvisionedCredentials = mutation({
    args: {
        id: v.id('applications'),
        lastSecretHint: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        if (!authorization.can(permissionCatalog.org.actor.serviceAccount.manage)) {
            throw new Error('Not authorized');
        }

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
        const authorization = await requireAuthorization(ctx);
        if (!authorization.can(permissionCatalog.org.actor.serviceAccount.manage)) {
            throw new Error('Not authorized');
        }

        const application = await ctx.db.get(args.applicationId);
        if (!application) return null;

        return {
            workosApplicationId: application.workosApplicationId,
            workosClientId: application.workosClientId,
        };
    },
});

export const permanentDelete = mutation({
    args: { id: v.id('applications') },
    handler: async (ctx, args) => {
        const authorization = await requireAuthorization(ctx);
        if (!authorization.can(permissionCatalog.org.actor.serviceAccount.manage)) {
            throw new Error('Not authorized');
        }

        const application = await ctx.db.get(args.id);
        if (!application) throw new Error('Application not found');
        if (application.status !== 'removed') throw new Error('Application must be removed before permanent deletion');

        const profile = await ctx.db
            .query('pluginProfiles')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .unique();
        if (profile) await ctx.db.delete(profile._id);

        const data = await ctx.db
            .query('pluginData')
            .withIndex('by_application', (q) => q.eq('applicationId', args.id))
            .collect();
        for (const row of data) await ctx.db.delete(row._id);

        const siteActors = await ctx.db
            .query('siteActors')
            .withIndex('by_actor', (q) => q.eq('actorId', application.actorId))
            .collect();
        for (const row of siteActors) await ctx.db.delete(row._id);

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

        await deletePermissionGrantsForActor(ctx, application.actorId);
        await ctx.db.delete(application.actorId);
        await ctx.db.delete(args.id);
    },
});
