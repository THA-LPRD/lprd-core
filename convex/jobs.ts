import { type GenericMutationCtx, paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { DataModel, Id } from './_generated/dataModel';
import { mutation, type MutationCtx, query, type QueryCtx } from './_generated/server';
import { getCurrentActor, getMembership } from './actors';
import { getPermissions } from './lib/acl';
import { canAccessWithInternalRenderScope } from './lib/internal_render';
import { generateUploadUrl as generateUploadUrlImpl, replaceThumbnail } from './lib/storage';
import { jobResourceType, jobSource, jobType } from './schema';

async function requireActorOrInternalRender(ctx: QueryCtx | MutationCtx) {
    if (await canAccessWithInternalRenderScope(ctx)) {
        return { actor: null as null, internal: true };
    }

    const actor = await getCurrentActor(ctx);
    if (!actor) throw new Error('Not authenticated');
    return { actor, internal: false };
}

type LatestJobState = {
    status: 'pending' | 'paused' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    updatedAt: number;
    errorMessage?: string;
    jobId?: Id<'jobs'>;
};

async function updateLatestJobState(
    ctx: GenericMutationCtx<DataModel>,
    resourceType: 'pluginData' | 'template' | 'frame' | 'device' | 'application',
    resourceId: string,
    latestJob: LatestJobState,
) {
    switch (resourceType) {
        case 'application':
            return;
        case 'pluginData': {
            const doc = await ctx.db.get(resourceId as Id<'pluginData'>);
            if (doc) await ctx.db.patch(doc._id, { latestJob });
            return;
        }
        case 'template': {
            const doc = await ctx.db.get(resourceId as Id<'templates'>);
            if (doc) await ctx.db.patch(doc._id, { latestJob });
            return;
        }
        case 'frame': {
            const doc = await ctx.db.get(resourceId as Id<'frames'>);
            if (doc) await ctx.db.patch(doc._id, { latestJob });
            return;
        }
        case 'device': {
            const doc = await ctx.db.get(resourceId as Id<'devices'>);
            if (doc) await ctx.db.patch(doc._id, { latestJob });
            return;
        }
    }
}

export const create = mutation({
    args: {
        siteId: v.optional(v.id('sites')),
        actorId: v.id('actors'),
        type: jobType,
        resourceType: jobResourceType,
        resourceId: v.string(),
        source: jobSource,
        dedupeKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const existing = await ctx.db
            .query('jobs')
            .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
            .unique();

        if (existing && (existing.status === 'pending' || existing.status === 'running')) {
            return existing._id;
        }

        const now = Date.now();
        const id = await ctx.db.insert('jobs', {
            ...args,
            status: 'pending',
            attempts: existing ? existing.attempts + 1 : 1,
            createdAt: now,
        });

        await updateLatestJobState(ctx, args.resourceType, args.resourceId, {
            status: 'pending',
            updatedAt: now,
            jobId: id,
        });

        return id;
    },
});

export const start = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'running',
            startedAt: now,
            errorMessage: undefined,
        });

        await updateLatestJobState(ctx, job.resourceType, job.resourceId, {
            status: 'running',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const succeed = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'succeeded',
            finishedAt: now,
            errorMessage: undefined,
        });

        await updateLatestJobState(ctx, job.resourceType, job.resourceId, {
            status: 'succeeded',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const fail = mutation({
    args: {
        id: v.id('jobs'),
        errorMessage: v.string(),
    },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'failed',
            finishedAt: now,
            errorMessage: args.errorMessage,
        });

        await updateLatestJobState(ctx, job.resourceType, job.resourceId, {
            status: 'failed',
            updatedAt: now,
            errorMessage: args.errorMessage,
            jobId: job._id,
        });
    },
});

export const cancel = mutation({
    args: {
        id: v.id('jobs'),
    },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.status !== 'pending') throw new Error('Only pending jobs can be cancelled');

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'cancelled',
            finishedAt: now,
            errorMessage: undefined,
        });

        await updateLatestJobState(ctx, job.resourceType, job.resourceId, {
            status: 'cancelled',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const pause = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.status !== 'pending') throw new Error('Only pending jobs can be paused');

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'paused',
            finishedAt: undefined,
            errorMessage: undefined,
        });

        await updateLatestJobState(ctx, job.resourceType, job.resourceId, {
            status: 'paused',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const resume = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);

        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.status !== 'paused') throw new Error('Only paused jobs can be resumed');

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });

        await updateLatestJobState(ctx, job.resourceType, job.resourceId, {
            status: 'pending',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const getById = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const job = await ctx.db.get(args.id);
        if (!job) return null;
        if (!job.siteId) return job;

        const membership = await getMembership(ctx, actor._id, job.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.site.view) return null;

        return job;
    },
});

export const getByIdForRoute = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);
        return ctx.db.get(args.id);
    },
});

export const listBySite = query({
    args: {
        siteId: v.id('sites'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return { page: [], isDone: true, continueCursor: '' };

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.site.view) return { page: [], isDone: true, continueCursor: '' };

        return ctx.db
            .query('jobs')
            .withIndex('by_site_and_createdAt', (q) => q.eq('siteId', args.siteId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireActorOrInternalRender(ctx);
        return generateUploadUrlImpl(ctx);
    },
});

export const storeTemplateThumbnail = mutation({
    args: {
        id: v.id('templates'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, args) => {
        const { actor, internal } = await requireActorOrInternalRender(ctx);
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');

        if (!internal) {
            if (template.scope !== 'site' || !template.siteId) {
                throw new Error('Forbidden');
            }

            const membership = await getMembership(ctx, actor!._id, template.siteId);
            const perms = getPermissions(actor!, membership);
            if (!perms.template.manage) throw new Error('Forbidden');
        }

        await replaceThumbnail(ctx, args.id, args.storageId);
    },
});

export const storeFrameThumbnail = mutation({
    args: {
        id: v.id('frames'),
        storageId: v.id('_storage'),
    },
    handler: async (ctx, args) => {
        const { actor, internal } = await requireActorOrInternalRender(ctx);
        const frame = await ctx.db.get(args.id);
        if (!frame) throw new Error('Frame not found');

        if (!internal) {
            const membership = await getMembership(ctx, actor!._id, frame.siteId);
            const perms = getPermissions(actor!, membership);
            if (!perms.frame.manage) throw new Error('Forbidden');
        }

        await replaceThumbnail(ctx, args.id, args.storageId);
    },
});

export const setDeviceNextRender = mutation({
    args: {
        deviceId: v.id('devices'),
        storageId: v.id('_storage'),
        renderedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const { actor, internal } = await requireActorOrInternalRender(ctx);
        const device = await ctx.db.get(args.deviceId);
        if (!device) return;

        if (!internal) {
            const membership = await getMembership(ctx, actor!._id, device.siteId);
            const perms = getPermissions(actor!, membership);
            if (!perms.device.manage) throw new Error('Forbidden');
        }

        if (device.next?.storageId) {
            await ctx.storage.delete(device.next.storageId);
        }

        await ctx.db.patch(device._id, {
            next: { storageId: args.storageId, renderedAt: args.renderedAt },
            updatedAt: Date.now(),
        });
    },
});

export const getStorageUrl = query({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, args) => {
        await requireActorOrInternalRender(ctx);
        return ctx.storage.getUrl(args.storageId);
    },
});

export const latestForResources = query({
    args: {
        resourceType: jobResourceType,
        resourceIds: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return {};

        const results: Record<string, { status: LatestJobState['status']; updatedAt: number; errorMessage?: string }> =
            {};
        for (const resourceId of args.resourceIds) {
            const jobs = await ctx.db
                .query('jobs')
                .withIndex('by_resource', (q) => q.eq('resourceType', args.resourceType).eq('resourceId', resourceId))
                .collect();

            const latest = jobs.sort((a, b) => b.createdAt - a.createdAt)[0];
            if (latest) {
                results[resourceId] = {
                    status: latest.status,
                    updatedAt: latest.finishedAt ?? latest.startedAt ?? latest.createdAt,
                    errorMessage: latest.errorMessage,
                };
            }
        }
        return results;
    },
});
