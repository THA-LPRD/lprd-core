import { type GenericMutationCtx, paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { DataModel, Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { jobSource } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import type { LatestJobState } from './types';

export async function updatePluginDataLatestJobState(
    ctx: GenericMutationCtx<DataModel>,
    pluginDataId: Id<'pluginData'>,
    latestJob: LatestJobState,
) {
    const pluginData = await ctx.db.get(pluginDataId);
    if (pluginData) await ctx.db.patch(pluginData._id, { latestJob });
}

export async function markPluginDataJobSucceeded(
    ctx: GenericMutationCtx<DataModel>,
    jobId: Id<'jobs'>,
    pluginDataId: Id<'pluginData'>,
) {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.resourceType !== 'pluginData' || job.resourceId !== pluginDataId) {
        throw new Error('Job does not match plugin data');
    }
    const now = Date.now();
    await ctx.db.patch(job._id, { status: 'succeeded', finishedAt: now, errorMessage: undefined });
    await updatePluginDataLatestJobState(ctx, pluginDataId, { status: 'succeeded', updatedAt: now, jobId: job._id });
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        pluginDataId: v.id('pluginData'),
        source: jobSource,
        dedupeKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const pluginData = await ctx.db.get(args.pluginDataId);
        if (!pluginData) throw new Error('Plugin data not found');
        if (args.siteId && args.siteId !== pluginData.siteId)
            throw new Error('Job site does not match plugin data site');
        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.enqueue, {
            siteId: pluginData.siteId,
        });
        const existing = await ctx.db
            .query('jobs')
            .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
            .unique();
        if (existing && (existing.status === 'pending' || existing.status === 'running')) return existing._id;
        const now = Date.now();
        const jobId = await ctx.db.insert('jobs', {
            actorId: args.actorId,
            siteId: pluginData.siteId,
            type: 'normalize-images',
            resourceType: 'pluginData',
            resourceId: args.pluginDataId,
            source: args.source,
            dedupeKey: args.dedupeKey,
            payload: args.payload,
            status: 'pending',
            attempts: existing ? existing.attempts + 1 : 1,
            createdAt: now,
        });
        await updatePluginDataLatestJobState(ctx, args.pluginDataId, { status: 'pending', updatedAt: now, jobId });
        return jobId;
    },
});

export const start = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'pluginData') throw new Error('Job not found');
        const pluginData = await ctx.db.get(job.resourceId as Id<'pluginData'>);
        if (!pluginData) throw new Error('Plugin data not found');
        if (job.siteId && job.siteId !== pluginData.siteId) throw new Error('Job site does not match plugin data site');
        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.write, {
            siteId: pluginData.siteId,
        });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'running', startedAt: now, errorMessage: undefined });
        await updatePluginDataLatestJobState(ctx, pluginData._id, {
            status: 'running',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const fail = mutation({
    args: { id: v.id('jobs'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'pluginData') throw new Error('Job not found');
        const pluginData = await ctx.db.get(job.resourceId as Id<'pluginData'>);
        if (!pluginData) throw new Error('Plugin data not found');
        if (job.siteId && job.siteId !== pluginData.siteId) throw new Error('Job site does not match plugin data site');
        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.write, {
            siteId: pluginData.siteId,
        });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'failed', finishedAt: now, errorMessage: args.errorMessage });
        await updatePluginDataLatestJobState(ctx, pluginData._id, {
            status: 'failed',
            updatedAt: now,
            errorMessage: args.errorMessage,
            jobId: job._id,
        });
    },
});

export const cancel = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'pluginData' || job.status !== 'pending') throw new Error('Job not found');
        const pluginData = await ctx.db.get(job.resourceId as Id<'pluginData'>);
        if (!pluginData) throw new Error('Plugin data not found');
        if (job.siteId && job.siteId !== pluginData.siteId) throw new Error('Job site does not match plugin data site');
        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.write, {
            siteId: pluginData.siteId,
        });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'cancelled', finishedAt: now, errorMessage: undefined });
        await updatePluginDataLatestJobState(ctx, pluginData._id, {
            status: 'cancelled',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const pause = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'pluginData' || job.status !== 'pending') throw new Error('Job not found');
        const pluginData = await ctx.db.get(job.resourceId as Id<'pluginData'>);
        if (!pluginData) throw new Error('Plugin data not found');
        if (job.siteId && job.siteId !== pluginData.siteId) throw new Error('Job site does not match plugin data site');
        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.write, {
            siteId: pluginData.siteId,
        });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'paused', finishedAt: undefined, errorMessage: undefined });
        await updatePluginDataLatestJobState(ctx, pluginData._id, { status: 'paused', updatedAt: now, jobId: job._id });
    },
});

export const resume = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'pluginData' || job.status !== 'paused') throw new Error('Job not found');
        const pluginData = await ctx.db.get(job.resourceId as Id<'pluginData'>);
        if (!pluginData) throw new Error('Plugin data not found');
        if (job.siteId && job.siteId !== pluginData.siteId) throw new Error('Job site does not match plugin data site');
        await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.write, {
            siteId: pluginData.siteId,
        });
        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await updatePluginDataLatestJobState(ctx, pluginData._id, {
            status: 'pending',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const getById = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'pluginData') return null;
        const pluginData = await ctx.db.get(job.resourceId as Id<'pluginData'>);
        if (!pluginData) return null;
        try {
            if (job.siteId && job.siteId !== pluginData.siteId) return null;
            await requirePermission(ctx, permissionCatalog.org.site.pluginData.manage.job.read, {
                siteId: pluginData.siteId,
            });
        } catch {
            return null;
        }
        return job;
    },
});

export const listBySite = query({
    args: { siteId: v.id('sites'), paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.pluginData.manage.job.read)) {
            return { page: [], isDone: true, continueCursor: '' };
        }
        return ctx.db
            .query('jobs')
            .withIndex('by_site_and_resourceType_and_createdAt', (q) =>
                q.eq('siteId', args.siteId).eq('resourceType', 'pluginData'),
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
