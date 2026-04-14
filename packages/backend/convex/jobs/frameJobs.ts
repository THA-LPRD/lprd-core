import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { mutation, type MutationCtx, query } from '../_generated/server';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import { permissionCatalog } from '../lib/permissions';
import { jobSource } from '../schema';
import type { LatestJobState } from './types';
import { buildLatestJobState, buildQueuedJobResult, serializeJobState } from './jobStateMappers';

export async function updateFrameLatestJobState(ctx: MutationCtx, frameId: Id<'frames'>, latestJob: LatestJobState) {
    const frame = await ctx.db.get(frameId);
    if (frame) {
        await ctx.db.patch(frame._id, { latestJob });
    }
}

export async function markFrameJobSucceeded(ctx: MutationCtx, executionId: Id<'jobLogs'>, frameId: Id<'frames'>) {
    const execution = await ctx.db.get(executionId);
    if (!execution) throw new Error('Job not found');
    if (execution.resourceType !== 'frame' || execution.resourceId !== frameId) {
        throw new Error('Job does not match frame');
    }

    const now = Date.now();
    await ctx.db.patch(execution._id, {
        status: 'succeeded',
        finishedAt: now,
        errorMessage: undefined,
    });

    if (!execution.jobStateId) return;
    const state = await ctx.db.get(execution.jobStateId);
    if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail') return;

    await ctx.db.patch(state._id, {
        status: 'succeeded',
        updatedAt: now,
        finishedAt: now,
        errorMessage: undefined,
        latestExecutionId: execution._id,
        latestFinishedExecutionId: execution._id,
        latestSuccessfulExecutionId: execution._id,
    });

    await updateFrameLatestJobState(
        ctx,
        frameId,
        buildLatestJobState({
            status: 'succeeded',
            updatedAt: now,
            jobStateId: state._id,
            executionId: execution._id,
        }),
    );
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        frameId: v.id('frames'),
        source: jobSource,
        workKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const frame = await ctx.db.get(args.frameId);
        if (!frame) throw new Error('Frame not found');
        if (args.siteId && args.siteId !== frame.siteId) throw new Error('Job site does not match frame site');

        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.enqueue, { siteId: frame.siteId });

        const existingState = await ctx.db
            .query('jobStates')
            .withIndex('by_workKey', (q) => q.eq('workKey', args.workKey))
            .unique();

        if (existingState && (existingState.resourceType !== 'frame' || existingState.type !== 'frame-thumbnail')) {
            throw new Error('Job work key already belongs to another resource');
        }

        if (existingState && ['pending', 'running', 'paused'].includes(existingState.status)) {
            return {
                jobStateId: existingState._id,
                executionId: existingState.currentExecutionId,
                shouldEnqueue: false,
            };
        }

        const now = Date.now();
        const jobStateId =
            existingState?._id ??
            (await ctx.db.insert('jobStates', {
                siteId: frame.siteId,
                actorId: args.actorId,
                type: 'frame-thumbnail',
                resourceType: 'frame',
                resourceId: args.frameId,
                source: args.source,
                workKey: args.workKey,
                status: 'pending',
                executionCount: 0,
                createdAt: now,
                updatedAt: now,
                queuedAt: now,
            }));

        const nextExecutionNumber = (existingState?.executionCount ?? 0) + 1;
        const executionId = await ctx.db.insert('jobLogs', {
            siteId: frame.siteId,
            actorId: args.actorId,
            type: 'frame-thumbnail',
            resourceType: 'frame',
            resourceId: args.frameId,
            source: args.source,
            status: 'pending',
            workKey: args.workKey,
            jobStateId,
            workerJobId: undefined,
            executionNumber: nextExecutionNumber,
            retryOfJobId: undefined,
            attempts: nextExecutionNumber,
            errorMessage: undefined,
            payload: args.payload,
            createdAt: now,
            startedAt: undefined,
            finishedAt: undefined,
        });

        await ctx.db.patch(executionId, { workerJobId: executionId });
        await ctx.db.patch(jobStateId, {
            siteId: frame.siteId,
            actorId: args.actorId,
            type: 'frame-thumbnail',
            resourceType: 'frame',
            resourceId: args.frameId,
            source: args.source,
            workKey: args.workKey,
            status: 'pending',
            executionCount: nextExecutionNumber,
            errorMessage: undefined,
            currentExecutionId: executionId,
            latestExecutionId: executionId,
            updatedAt: now,
            queuedAt: now,
            startedAt: undefined,
            finishedAt: undefined,
        });

        await updateFrameLatestJobState(
            ctx,
            args.frameId,
            buildLatestJobState({
                status: 'pending',
                updatedAt: now,
                jobStateId,
                executionId,
            }),
        );

        return {
            jobStateId,
            executionId,
            shouldEnqueue: true,
        };
    },
});

export const start = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail')
            throw new Error('Job not found');
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (state.siteId && state.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        if (state.status !== 'pending' || execution.status !== 'pending') {
            throw new Error('Only pending jobs can be started');
        }

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'running',
            startedAt: now,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await ctx.db.patch(state._id, {
            status: 'running',
            updatedAt: now,
            startedAt: now,
            finishedAt: undefined,
            errorMessage: undefined,
            latestExecutionId: execution._id,
        });

        await updateFrameLatestJobState(
            ctx,
            frame._id,
            buildLatestJobState({
                status: 'running',
                updatedAt: now,
                jobStateId: state._id,
                executionId: execution._id,
            }),
        );
    },
});

export const fail = mutation({
    args: { id: v.id('jobStates'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail')
            throw new Error('Job not found');
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (state.siteId && state.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        const now = Date.now();

        await ctx.db.patch(execution._id, {
            status: 'failed',
            finishedAt: now,
            errorMessage: args.errorMessage,
        });
        await ctx.db.patch(state._id, {
            status: 'failed',
            updatedAt: now,
            finishedAt: now,
            errorMessage: args.errorMessage,
            latestExecutionId: execution._id,
            latestFinishedExecutionId: execution._id,
        });

        await updateFrameLatestJobState(
            ctx,
            frame._id,
            buildLatestJobState({
                status: 'failed',
                updatedAt: now,
                jobStateId: state._id,
                executionId: execution._id,
                errorMessage: args.errorMessage,
            }),
        );
    },
});

export const cancel = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail')
            throw new Error('Job not found');
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (state.siteId && state.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        if (state.status !== 'pending' || execution.status !== 'pending') {
            throw new Error('Only pending jobs can be cancelled');
        }

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'cancelled',
            finishedAt: now,
            errorMessage: undefined,
        });
        await ctx.db.patch(state._id, {
            status: 'cancelled',
            updatedAt: now,
            finishedAt: now,
            errorMessage: undefined,
            latestExecutionId: execution._id,
            latestFinishedExecutionId: execution._id,
        });

        await updateFrameLatestJobState(
            ctx,
            frame._id,
            buildLatestJobState({
                status: 'cancelled',
                updatedAt: now,
                jobStateId: state._id,
                executionId: execution._id,
            }),
        );

        return execution.workerJobId ?? execution._id;
    },
});

export const pause = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail')
            throw new Error('Job not found');
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (state.siteId && state.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        if (state.status !== 'pending' || execution.status !== 'pending') {
            throw new Error('Only pending jobs can be paused');
        }

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'paused',
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await ctx.db.patch(state._id, {
            status: 'paused',
            updatedAt: now,
            finishedAt: undefined,
            errorMessage: undefined,
            latestExecutionId: execution._id,
        });

        await updateFrameLatestJobState(
            ctx,
            frame._id,
            buildLatestJobState({
                status: 'paused',
                updatedAt: now,
                jobStateId: state._id,
                executionId: execution._id,
            }),
        );

        return execution.workerJobId ?? execution._id;
    },
});

export const resume = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail')
            throw new Error('Job not found');
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (state.siteId && state.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        if (state.status !== 'paused' || execution.status !== 'paused') {
            throw new Error('Only paused jobs can be resumed');
        }

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await ctx.db.patch(state._id, {
            status: 'pending',
            updatedAt: now,
            queuedAt: now,
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
            latestExecutionId: execution._id,
        });

        await updateFrameLatestJobState(
            ctx,
            frame._id,
            buildLatestJobState({
                status: 'pending',
                updatedAt: now,
                jobStateId: state._id,
                executionId: execution._id,
            }),
        );

        return buildQueuedJobResult(state, {
            ...execution,
            status: 'pending',
            workerJobId: execution.workerJobId ?? execution._id,
        });
    },
});

export const retry = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail')
            throw new Error('Job not found');
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) throw new Error('Frame not found');
        if (state.siteId && state.siteId !== frame.siteId) throw new Error('Job site does not match frame site');
        await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.write, { siteId: frame.siteId });
        if (state.status !== 'failed' || execution.status !== 'failed') {
            throw new Error('Only failed jobs can be retried');
        }

        const now = Date.now();
        const nextExecutionNumber = state.executionCount + 1;
        const nextExecutionId = await ctx.db.insert('jobLogs', {
            siteId: state.siteId,
            actorId: state.actorId,
            type: state.type,
            resourceType: state.resourceType,
            resourceId: state.resourceId,
            source: state.source,
            status: 'pending',
            workKey: state.workKey,
            jobStateId: state._id,
            workerJobId: undefined,
            executionNumber: nextExecutionNumber,
            retryOfJobId: execution._id,
            attempts: nextExecutionNumber,
            errorMessage: undefined,
            payload: execution.payload,
            createdAt: now,
            startedAt: undefined,
            finishedAt: undefined,
        });

        await ctx.db.patch(nextExecutionId, { workerJobId: nextExecutionId });
        await ctx.db.patch(state._id, {
            status: 'pending',
            executionCount: nextExecutionNumber,
            errorMessage: undefined,
            currentExecutionId: nextExecutionId,
            latestExecutionId: nextExecutionId,
            updatedAt: now,
            queuedAt: now,
            startedAt: undefined,
            finishedAt: undefined,
        });

        await updateFrameLatestJobState(
            ctx,
            frame._id,
            buildLatestJobState({
                status: 'pending',
                updatedAt: now,
                jobStateId: state._id,
                executionId: nextExecutionId,
            }),
        );

        const nextExecution = await ctx.db.get(nextExecutionId);
        if (!nextExecution) throw new Error('Retried job execution not found');
        return buildQueuedJobResult(state, nextExecution);
    },
});

export const getById = query({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.id);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail') return null;

        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) return null;

        try {
            if (state.siteId && state.siteId !== frame.siteId) return null;
            await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.read, { siteId: frame.siteId });
        } catch {
            return null;
        }

        return await serializeJobState(ctx, state);
    },
});

export const listBySite = query({
    args: { siteId: v.id('sites'), paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.frame.manage.job.read)) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const result = await ctx.db
            .query('jobStates')
            .withIndex('by_site_and_resourceType_and_updatedAt', (q) =>
                q.eq('siteId', args.siteId).eq('resourceType', 'frame'),
            )
            .order('desc')
            .paginate(args.paginationOpts);

        return {
            ...result,
            page: await Promise.all(result.page.map((state) => serializeJobState(ctx, state))),
        };
    },
});

export const listExecutions = query({
    args: { jobStateId: v.id('jobStates'), paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const state = await ctx.db.get(args.jobStateId);
        if (!state || state.resourceType !== 'frame' || state.type !== 'frame-thumbnail') {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const frame = await ctx.db.get(state.resourceId as Id<'frames'>);
        if (!frame) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        try {
            await requirePermission(ctx, permissionCatalog.org.site.frame.manage.job.read, { siteId: frame.siteId });
        } catch {
            return { page: [], isDone: true, continueCursor: '' };
        }

        return await ctx.db
            .query('jobLogs')
            .withIndex('by_jobState_and_createdAt', (q) => q.eq('jobStateId', args.jobStateId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
