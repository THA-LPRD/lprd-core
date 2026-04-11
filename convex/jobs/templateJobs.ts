import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { mutation, type MutationCtx, query } from '../_generated/server';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import { permissionCatalog } from '../lib/permissions';
import { jobSource } from '../schema';
import type { LatestJobState } from './types';
import { buildLatestJobState, buildQueuedJobResult, serializeJobState } from './jobStateMappers';

const templateJobType = v.union(v.literal('normalize-images'), v.literal('template-thumbnail'));

export async function updateTemplateLatestJobState(
    ctx: MutationCtx,
    templateId: Id<'templates'>,
    latestJob: LatestJobState,
) {
    const template = await ctx.db.get(templateId);
    if (template) {
        await ctx.db.patch(template._id, { latestJob });
    }
}

export async function markTemplateJobSucceeded(
    ctx: MutationCtx,
    executionId: Id<'jobLogs'>,
    templateId: Id<'templates'>,
) {
    const execution = await ctx.db.get(executionId);
    if (!execution) throw new Error('Job not found');
    if (execution.resourceType !== 'template' || execution.resourceId !== templateId) {
        throw new Error('Job does not match template');
    }

    const now = Date.now();
    await ctx.db.patch(execution._id, {
        status: 'succeeded',
        finishedAt: now,
        errorMessage: undefined,
    });

    if (!execution.jobStateId) return;
    const state = await ctx.db.get(execution.jobStateId);
    if (!state || state.resourceType !== 'template') return;
    if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') return;

    await ctx.db.patch(state._id, {
        status: 'succeeded',
        updatedAt: now,
        finishedAt: now,
        errorMessage: undefined,
        latestExecutionId: execution._id,
        latestFinishedExecutionId: execution._id,
        latestSuccessfulExecutionId: execution._id,
    });

    await updateTemplateLatestJobState(
        ctx,
        templateId,
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
        type: templateJobType,
        templateId: v.id('templates'),
        source: jobSource,
        workKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.templateId);
        if (!template) throw new Error('Template not found');

        let siteId: Id<'sites'> | undefined;
        if (template.scope === 'site' && template.siteId) {
            if (args.siteId && args.siteId !== template.siteId) {
                throw new Error('Job site does not match template site');
            }
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.enqueue, {
                siteId: template.siteId,
            });
            siteId = template.siteId;
        } else {
            if (args.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.enqueue, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const existingState = await ctx.db
            .query('jobStates')
            .withIndex('by_workKey', (q) => q.eq('workKey', args.workKey))
            .unique();

        if (existingState && existingState.resourceType !== 'template') {
            throw new Error('Job work key already belongs to another resource');
        }
        if (existingState && existingState.type !== 'normalize-images' && existingState.type !== 'template-thumbnail') {
            throw new Error(`Job type '${existingState.type}' is not valid for templates`);
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
                siteId,
                actorId: args.actorId,
                type: args.type,
                resourceType: 'template',
                resourceId: args.templateId,
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
            siteId,
            actorId: args.actorId,
            type: args.type,
            resourceType: 'template',
            resourceId: args.templateId,
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
            siteId,
            actorId: args.actorId,
            type: args.type,
            resourceType: 'template',
            resourceId: args.templateId,
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

        await updateTemplateLatestJobState(
            ctx,
            args.templateId,
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
        if (!state) throw new Error('Job not found');
        if (state.resourceType !== 'template') throw new Error('Job does not target a template');
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            throw new Error(`Job type '${state.type}' is not valid for templates`);
        }
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (state.siteId && state.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (state.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

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

        await updateTemplateLatestJobState(
            ctx,
            template._id,
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
        if (!state) throw new Error('Job not found');
        if (state.resourceType !== 'template') throw new Error('Job does not target a template');
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            throw new Error(`Job type '${state.type}' is not valid for templates`);
        }
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (state.siteId && state.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (state.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

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

        await updateTemplateLatestJobState(
            ctx,
            template._id,
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
        if (!state) throw new Error('Job not found');
        if (state.resourceType !== 'template') throw new Error('Job does not target a template');
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            throw new Error(`Job type '${state.type}' is not valid for templates`);
        }
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (state.siteId && state.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (state.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

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

        await updateTemplateLatestJobState(
            ctx,
            template._id,
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
        if (!state) throw new Error('Job not found');
        if (state.resourceType !== 'template') throw new Error('Job does not target a template');
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            throw new Error(`Job type '${state.type}' is not valid for templates`);
        }
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (state.siteId && state.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (state.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

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

        await updateTemplateLatestJobState(
            ctx,
            template._id,
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
        if (!state) throw new Error('Job not found');
        if (state.resourceType !== 'template') throw new Error('Job does not target a template');
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            throw new Error(`Job type '${state.type}' is not valid for templates`);
        }
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (state.siteId && state.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (state.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

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

        await updateTemplateLatestJobState(
            ctx,
            template._id,
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
        if (!state) throw new Error('Job not found');
        if (state.resourceType !== 'template') throw new Error('Job does not target a template');
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            throw new Error(`Job type '${state.type}' is not valid for templates`);
        }
        const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;
        if (!execution) throw new Error('Job execution not found');

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (state.siteId && state.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (state.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

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

        await updateTemplateLatestJobState(
            ctx,
            template._id,
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
        if (!state || state.resourceType !== 'template') return null;
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') return null;

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) return null;

        try {
            if (template.scope === 'site' && template.siteId) {
                if (state.siteId && state.siteId !== template.siteId) return null;
                await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.read, {
                    siteId: template.siteId,
                });
            } else {
                if (state.siteId) return null;
                await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.read, {
                    organizationId: template.organizationId ?? undefined,
                });
            }
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
        if (!authorization?.can(permissionCatalog.org.site.template.manage.job.read)) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const result = await ctx.db
            .query('jobStates')
            .withIndex('by_site_and_resourceType_and_updatedAt', (q) =>
                q.eq('siteId', args.siteId).eq('resourceType', 'template'),
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
        if (!state || state.resourceType !== 'template') {
            return { page: [], isDone: true, continueCursor: '' };
        }
        if (state.type !== 'normalize-images' && state.type !== 'template-thumbnail') {
            return { page: [], isDone: true, continueCursor: '' };
        }

        const template = await ctx.db.get(state.resourceId as Id<'templates'>);
        if (!template) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        try {
            if (template.scope === 'site' && template.siteId) {
                await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.read, {
                    siteId: template.siteId,
                });
            } else {
                await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.read, {
                    organizationId: template.organizationId ?? undefined,
                });
            }
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
