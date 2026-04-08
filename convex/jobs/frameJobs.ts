import { type GenericMutationCtx, paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { DataModel, Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { jobSource } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import type { LatestJobState } from './types';

export async function updateFrameLatestJobState(
    ctx: GenericMutationCtx<DataModel>,
    frameId: Id<'frames'>,
    latestJob: LatestJobState,
) {
    const frame = await ctx.db.get(frameId);
    if (frame) await ctx.db.patch(frame._id, { latestJob });
}

export async function markFrameJobSucceeded(
    ctx: GenericMutationCtx<DataModel>,
    jobId: Id<'jobs'>,
    frameId: Id<'frames'>,
) {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.resourceType !== 'frame' || job.resourceId !== frameId) throw new Error('Job does not match frame');
    const now = Date.now();
    await ctx.db.patch(job._id, { status: 'succeeded', finishedAt: now, errorMessage: undefined });
    await updateFrameLatestJobState(ctx, frameId, { status: 'succeeded', updatedAt: now, jobId: job._id });
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        frameId: v.id('frames'),
        source: jobSource,
        dedupeKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) throw new Error('Frame not found');
        if (args.siteId && args.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.enqueue, { siteId: frame.siteId });
        const existing = await ctx.db
            .query('jobs')
            .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
            .unique();
        if (existing && (existing.status === 'pending' || existing.status === 'running')) return existing._id;
        const now = Date.now();
        const jobId = await ctx.db.insert('jobs', {
            actorId: args.actorId,
            siteId: frame.siteId,
            type: 'frame-thumbnail',
            resourceType: 'frame',
            resourceId: args.frameId,
            source: args.source,
            dedupeKey: args.dedupeKey,
            payload: args.payload,
            status: 'pending',
            attempts: existing ? existing.attempts + 1 : 1,
            createdAt: now,
        });
        await updateFrameLatestJobState(ctx, args.frameId, { status: 'pending', updatedAt: now, jobId });
        return jobId;
    },
});

export const start = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'frame') throw new Error('Job not found');
        const frame = await ctx.db.get(job.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (job.siteId && job.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'running', startedAt: now, errorMessage: undefined });
        await updateFrameLatestJobState(ctx, frame._id, { status: 'running', updatedAt: now, jobId: job._id });
    },
});

export const fail = mutation({
    args: { id: v.id('jobs'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'frame') throw new Error('Job not found');
        const frame = await ctx.db.get(job.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (job.siteId && job.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'failed', finishedAt: now, errorMessage: args.errorMessage });
        await updateFrameLatestJobState(ctx, frame._id, {
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
        if (!job || job.resourceType !== 'frame' || job.status !== 'pending') throw new Error('Job not found');
        const frame = await ctx.db.get(job.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (job.siteId && job.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'cancelled', finishedAt: now, errorMessage: undefined });
        await updateFrameLatestJobState(ctx, frame._id, { status: 'cancelled', updatedAt: now, jobId: job._id });
    },
});

export const pause = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'frame' || job.status !== 'pending') throw new Error('Job not found');
        const frame = await ctx.db.get(job.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (job.siteId && job.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'paused', finishedAt: undefined, errorMessage: undefined });
        await updateFrameLatestJobState(ctx, frame._id, { status: 'paused', updatedAt: now, jobId: job._id });
    },
});

export const resume = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'frame' || job.status !== 'paused') throw new Error('Job not found');
        const frame = await ctx.db.get(job.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (job.siteId && job.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await updateFrameLatestJobState(ctx, frame._id, { status: 'pending', updatedAt: now, jobId: job._id });
    },
});

export const getById = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'frame') return null;
        const frame = await ctx.db.get(job.resourceId as Id<'frames'>);
        if (!frame) return null;
        try {
            if (job.siteId && job.siteId !== frame.siteId) return null;
            await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.read, { siteId: frame.siteId });
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
        if (!authorization?.can(permissionCatalog.org.site.frame.manage.job.read)) {
            return { page: [], isDone: true, continueCursor: '' };
        }
        return ctx.db
            .query('jobs')
            .withIndex('by_site_and_resourceType_and_createdAt', (q) =>
                q.eq('siteId', args.siteId).eq('resourceType', 'frame'),
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
