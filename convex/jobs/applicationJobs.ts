import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { mutation, type MutationCtx, query } from '../_generated/server';
import { jobSource } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission } from '../lib/authz';
import { buildQueuedJobResult, serializeJobState } from './jobStateMappers';

export async function markApplicationJobSucceeded(
    ctx: MutationCtx,
    executionId: Id<'jobLogs'>,
    applicationId: Id<'applications'>,
) {
    const execution = await ctx.db.get(executionId);
    if (!execution) throw new Error('Job not found');
    if (execution.resourceType !== 'application' || execution.resourceId !== applicationId) {
        throw new Error('Job does not match application');
    }

    const now = Date.now();
    await ctx.db.patch(execution._id, {
        status: 'succeeded',
        finishedAt: now,
        errorMessage: undefined,
    });

    if (!execution.jobStateId) return;
    const state = await ctx.db.get(execution.jobStateId);
    if (!state || state.resourceType !== 'application' || state.type !== 'health-check') return;
    await ctx.db.patch(state._id, {
        status: 'succeeded',
        updatedAt: now,
        finishedAt: now,
        errorMessage: undefined,
        latestExecutionId: execution._id,
        latestFinishedExecutionId: execution._id,
        latestSuccessfulExecutionId: execution._id,
    });
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        applicationId: v.id('applications'),
        source: jobSource,
        workKey: v.string(),
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

        const existingState = await ctx.db
            .query('jobStates')
            .withIndex('by_workKey', (q) => q.eq('workKey', args.workKey))
            .unique();
        if (existingState && (existingState.resourceType !== 'application' || existingState.type !== 'health-check')) {
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
                actorId: args.actorId,
                siteId: args.siteId,
                type: 'health-check',
                resourceType: 'application',
                resourceId: args.applicationId,
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
            actorId: args.actorId,
            siteId: args.siteId,
            type: 'health-check',
            resourceType: 'application',
            resourceId: args.applicationId,
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
            actorId: args.actorId,
            siteId: args.siteId,
            type: 'health-check',
            resourceType: 'application',
            resourceId: args.applicationId,
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
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check') throw new Error('Job not found');
        const execution = job.currentExecutionId ? await ctx.db.get(job.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
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
        if (job.status !== 'pending' || execution.status !== 'pending') {
            throw new Error('Only pending jobs can be started');
        }

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'running',
            startedAt: now,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await ctx.db.patch(job._id, {
            status: 'running',
            updatedAt: now,
            startedAt: now,
            finishedAt: undefined,
            errorMessage: undefined,
            latestExecutionId: execution._id,
        });
    },
});

export const fail = mutation({
    args: { id: v.id('jobStates'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check') throw new Error('Job not found');
        const execution = job.currentExecutionId ? await ctx.db.get(job.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
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

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'failed',
            finishedAt: now,
            errorMessage: args.errorMessage,
        });
        await ctx.db.patch(job._id, {
            status: 'failed',
            updatedAt: now,
            finishedAt: now,
            errorMessage: args.errorMessage,
            latestExecutionId: execution._id,
            latestFinishedExecutionId: execution._id,
        });
    },
});

export const cancel = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check' || job.status !== 'pending') {
            throw new Error('Job not found');
        }
        const execution = job.currentExecutionId ? await ctx.db.get(job.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        if (execution.status !== 'pending') throw new Error('Only pending jobs can be cancelled');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'cancelled',
            finishedAt: now,
            errorMessage: undefined,
        });
        await ctx.db.patch(job._id, {
            status: 'cancelled',
            updatedAt: now,
            finishedAt: now,
            errorMessage: undefined,
            latestExecutionId: execution._id,
            latestFinishedExecutionId: execution._id,
        });

        return execution.workerJobId ?? execution._id;
    },
});

export const pause = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check' || job.status !== 'pending') {
            throw new Error('Job not found');
        }
        const execution = job.currentExecutionId ? await ctx.db.get(job.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        if (execution.status !== 'pending') throw new Error('Only pending jobs can be paused');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'paused',
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await ctx.db.patch(job._id, {
            status: 'paused',
            updatedAt: now,
            finishedAt: undefined,
            errorMessage: undefined,
            latestExecutionId: execution._id,
        });

        return execution.workerJobId ?? execution._id;
    },
});

export const resume = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check' || job.status !== 'paused') {
            throw new Error('Job not found');
        }
        const execution = job.currentExecutionId ? await ctx.db.get(job.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        if (execution.status !== 'paused') throw new Error('Only paused jobs can be resumed');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });

        const now = Date.now();
        await ctx.db.patch(execution._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });
        await ctx.db.patch(job._id, {
            status: 'pending',
            updatedAt: now,
            queuedAt: now,
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
            latestExecutionId: execution._id,
        });

        return buildQueuedJobResult(job, execution);
    },
});

export const retry = mutation({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check' || job.status !== 'failed') {
            throw new Error('Job not found');
        }
        const execution = job.currentExecutionId ? await ctx.db.get(job.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');
        if (execution.status !== 'failed') throw new Error('Only failed jobs can be retried');
        const application = await ctx.db.get(job.resourceId as Id<'applications'>);
        if (!application) throw new Error('Application not found');
        if (!application.organizationId) throw new Error('Application organization required');
        await requirePermission(ctx, permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write, {
            organizationId: application.organizationId,
        });

        const now = Date.now();
        const nextExecutionNumber = job.executionCount + 1;
        const nextExecutionId = await ctx.db.insert('jobLogs', {
            siteId: job.siteId,
            actorId: job.actorId,
            type: job.type,
            resourceType: job.resourceType,
            resourceId: job.resourceId,
            source: job.source,
            status: 'pending',
            workKey: job.workKey,
            jobStateId: job._id,
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
        await ctx.db.patch(job._id, {
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

        const nextExecution = await ctx.db.get(nextExecutionId);
        if (!nextExecution) throw new Error('Retried job execution not found');
        return buildQueuedJobResult(job, nextExecution);
    },
});

export const getById = query({
    args: { id: v.id('jobStates') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'application' || job.type !== 'health-check') return null;
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

        return await serializeJobState(ctx, job);
    },
});
