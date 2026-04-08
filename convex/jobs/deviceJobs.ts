import { type GenericMutationCtx, paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { DataModel, Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { jobSource } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import type { LatestJobState } from './types';

export async function updateDeviceLatestJobState(
    ctx: GenericMutationCtx<DataModel>,
    deviceId: Id<'devices'>,
    latestJob: LatestJobState,
) {
    const device = await ctx.db.get(deviceId);
    if (device) await ctx.db.patch(device._id, { latestJob });
}

export async function markDeviceJobSucceeded(
    ctx: GenericMutationCtx<DataModel>,
    jobId: Id<'jobs'>,
    deviceId: Id<'devices'>,
) {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.resourceType !== 'device' || job.resourceId !== deviceId) throw new Error('Job does not match device');
    const now = Date.now();
    await ctx.db.patch(job._id, { status: 'succeeded', finishedAt: now, errorMessage: undefined });
    await updateDeviceLatestJobState(ctx, deviceId, { status: 'succeeded', updatedAt: now, jobId: job._id });
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        deviceId: v.id('devices'),
        source: jobSource,
        dedupeKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device) throw new Error('Device not found');
        if (args.siteId && args.siteId !== device.siteId) throw new Error('Job site does not match device site');
        await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.enqueue, { siteId: device.siteId });
        const existing = await ctx.db
            .query('jobs')
            .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
            .unique();
        if (existing && (existing.status === 'pending' || existing.status === 'running')) return existing._id;
        const now = Date.now();
        const jobId = await ctx.db.insert('jobs', {
            actorId: args.actorId,
            siteId: device.siteId,
            type: 'device-render',
            resourceType: 'device',
            resourceId: args.deviceId,
            source: args.source,
            dedupeKey: args.dedupeKey,
            payload: args.payload,
            status: 'pending',
            attempts: existing ? existing.attempts + 1 : 1,
            createdAt: now,
        });
        await updateDeviceLatestJobState(ctx, args.deviceId, { status: 'pending', updatedAt: now, jobId });
        return jobId;
    },
});

export const start = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'device') throw new Error('Job not found');
        const device = await ctx.db.get(job.resourceId as Id<'devices'>);
        if (!device) throw new Error('Device not found');
        if (job.siteId && job.siteId !== device.siteId) throw new Error('Job site does not match device site');
        await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.write, { siteId: device.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'running', startedAt: now, errorMessage: undefined });
        await updateDeviceLatestJobState(ctx, device._id, { status: 'running', updatedAt: now, jobId: job._id });
    },
});

export const fail = mutation({
    args: { id: v.id('jobs'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'device') throw new Error('Job not found');
        const device = await ctx.db.get(job.resourceId as Id<'devices'>);
        if (!device) throw new Error('Device not found');
        if (job.siteId && job.siteId !== device.siteId) throw new Error('Job site does not match device site');
        await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.write, { siteId: device.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'failed', finishedAt: now, errorMessage: args.errorMessage });
        await updateDeviceLatestJobState(ctx, device._id, {
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
        if (!job || job.resourceType !== 'device' || job.status !== 'pending') throw new Error('Job not found');
        const device = await ctx.db.get(job.resourceId as Id<'devices'>);
        if (!device) throw new Error('Device not found');
        if (job.siteId && job.siteId !== device.siteId) throw new Error('Job site does not match device site');
        await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.write, { siteId: device.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'cancelled', finishedAt: now, errorMessage: undefined });
        await updateDeviceLatestJobState(ctx, device._id, { status: 'cancelled', updatedAt: now, jobId: job._id });
    },
});

export const pause = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'device' || job.status !== 'pending') throw new Error('Job not found');
        const device = await ctx.db.get(job.resourceId as Id<'devices'>);
        if (!device) throw new Error('Device not found');
        if (job.siteId && job.siteId !== device.siteId) throw new Error('Job site does not match device site');
        await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.write, { siteId: device.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, { status: 'paused', finishedAt: undefined, errorMessage: undefined });
        await updateDeviceLatestJobState(ctx, device._id, { status: 'paused', updatedAt: now, jobId: job._id });
    },
});

export const resume = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'device' || job.status !== 'paused') throw new Error('Job not found');
        const device = await ctx.db.get(job.resourceId as Id<'devices'>);
        if (!device) throw new Error('Device not found');
        if (job.siteId && job.siteId !== device.siteId) throw new Error('Job site does not match device site');
        await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.write, { siteId: device.siteId });
        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await updateDeviceLatestJobState(ctx, device._id, { status: 'pending', updatedAt: now, jobId: job._id });
    },
});

export const getById = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'device') return null;
        const device = await ctx.db.get(job.resourceId as Id<'devices'>);
        if (!device) return null;
        try {
            if (job.siteId && job.siteId !== device.siteId) return null;
            await requirePermission(ctx, permissionCatalog.org.site.device.manage.job.read, { siteId: device.siteId });
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
        if (!authorization?.can(permissionCatalog.org.site.device.manage.job.read)) {
            return { page: [], isDone: true, continueCursor: '' };
        }
        return ctx.db
            .query('jobs')
            .withIndex('by_site_and_resourceType_and_createdAt', (q) =>
                q.eq('siteId', args.siteId).eq('resourceType', 'device'),
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
