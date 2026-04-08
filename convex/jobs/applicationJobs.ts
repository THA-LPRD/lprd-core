import { v } from 'convex/values';
import type { DataModel, Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { jobSource } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission } from '../lib/authz';
import type { GenericMutationCtx } from 'convex/server';

export async function markApplicationJobSucceeded(
    ctx: GenericMutationCtx<DataModel>,
    jobId: Id<'jobs'>,
    applicationId: Id<'applications'>,
) {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.resourceType !== 'application' || job.resourceId !== applicationId) {
        throw new Error('Job does not match application');
    }

    const now = Date.now();
    await ctx.db.patch(job._id, {
        status: 'succeeded',
        finishedAt: now,
        errorMessage: undefined,
    });
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        applicationId: v.id('applications'),
        source: jobSource,
        dedupeKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        if (args.siteId) {
            const site = await ctx.db.get(args.siteId);
            if (!site) throw new Error('Site not found');
            if (site.organizationId !== application.organizationId) {
                throw new Error('Job site does not belong to the application organization');
            }
        }
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.enqueue, {
            organizationId: application.organizationId,
        });
        const existing = await ctx.db
            .query('jobs')
            .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
            .unique();
        if (existing && (existing.status === 'pending' || existing.status === 'running')) return existing._id;
        const now = Date.now();
        return ctx.db.insert('jobs', {
            actorId: args.actorId,
            siteId: args.siteId,
            type: 'health-check',
            resourceType: 'application',
            resourceId: args.applicationId,
            source: args.source,
            dedupeKey: args.dedupeKey,
            payload: args.payload,
            status: 'pending',
            attempts: existing ? existing.attempts + 1 : 1,
            createdAt: now,
        });
    },
});

export const start = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application') throw new Error('Job not found');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        if (job.siteId) {
            const site = await ctx.db.get(job.siteId);
            if (!site) throw new Error('Site not found');
            if (site.organizationId !== application.organizationId) {
                throw new Error('Job site does not belong to the application organization');
            }
        }
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });
        await ctx.db.patch(job._id, { status: 'running', startedAt: Date.now(), errorMessage: undefined });
    },
});

export const fail = mutation({
    args: { id: v.id('jobs'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application') throw new Error('Job not found');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        if (job.siteId) {
            const site = await ctx.db.get(job.siteId);
            if (!site) throw new Error('Site not found');
            if (site.organizationId !== application.organizationId) {
                throw new Error('Job site does not belong to the application organization');
            }
        }
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });
        await ctx.db.patch(job._id, { status: 'failed', finishedAt: Date.now(), errorMessage: args.errorMessage });
    },
});

export const cancel = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.status !== 'pending') throw new Error('Job not found');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });
        await ctx.db.patch(job._id, { status: 'cancelled', finishedAt: Date.now(), errorMessage: undefined });
    },
});

export const pause = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.status !== 'pending') throw new Error('Job not found');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });
        await ctx.db.patch(job._id, { status: 'paused', finishedAt: undefined, errorMessage: undefined });
    },
});

export const resume = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.status !== 'paused') throw new Error('Job not found');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });
        await ctx.db.patch(job._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });
    },
});

export const getById = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application') return null;
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application?.organizationId) return null;
        try {
            if (job.siteId) {
                const site = await ctx.db.get(job.siteId);
                if (!site || site.organizationId !== application.organizationId) return null;
            }
            await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.read, {
                organizationId: application.organizationId,
            });
        } catch {
            return null;
        }
        return job;
    },
});
