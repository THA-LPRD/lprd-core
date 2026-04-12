import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import type { LatestJobState } from './types';

type JobState = Doc<'jobStates'>;
type JobLog = Doc<'jobLogs'>;

async function resolveResourceName(ctx: QueryCtx, resourceType: string, resourceId: string): Promise<string | null> {
    switch (resourceType) {
        case 'template': {
            const doc = await ctx.db.get(resourceId as Id<'templates'>);
            return doc?.name ?? null;
        }
        case 'frame': {
            const doc = await ctx.db.get(resourceId as Id<'frames'>);
            return doc?.name ?? null;
        }
        case 'device': {
            const doc = await ctx.db.get(resourceId as Id<'devices'>);
            return doc?.name ?? null;
        }
        case 'pluginData': {
            const doc = await ctx.db.get(resourceId as Id<'pluginData'>);
            return doc ? `${doc.topic}/${doc.entry}` : null;
        }
        case 'application': {
            const doc = await ctx.db.get(resourceId as Id<'applications'>);
            return doc?.name ?? null;
        }
        default:
            return null;
    }
}

export function buildLatestJobState(input: {
    status: LatestJobState['status'];
    updatedAt: number;
    jobStateId: Id<'jobStates'>;
    executionId?: Id<'jobLogs'>;
    errorMessage?: string;
}): LatestJobState {
    return {
        status: input.status,
        updatedAt: input.updatedAt,
        errorMessage: input.errorMessage,
        jobId: input.executionId,
        jobStateId: input.jobStateId,
        executionId: input.executionId,
    };
}

async function getDisplayExecution(ctx: QueryCtx, state: JobState) {
    return (
        (state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null) ??
        (state.latestExecutionId ? await ctx.db.get(state.latestExecutionId) : null) ??
        (state.latestFinishedExecutionId ? await ctx.db.get(state.latestFinishedExecutionId) : null)
    );
}

export async function serializeJobState(ctx: QueryCtx, state: JobState) {
    const execution = await getDisplayExecution(ctx, state);
    const resourceName = await resolveResourceName(ctx, state.resourceType, state.resourceId);
    return {
        _id: state._id,
        actorId: state.actorId,
        siteId: state.siteId,
        type: state.type,
        resourceType: state.resourceType,
        resourceId: state.resourceId,
        resourceName,
        source: execution?.source ?? state.source,
        status: state.status,
        createdAt: execution?.createdAt ?? state.createdAt,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
        errorMessage: state.errorMessage,
        payload: execution?.payload,
        currentExecutionId: state.currentExecutionId,
        executionCount: state.executionCount,
        workKey: state.workKey,
    };
}

export function buildQueuedJobResult(state: JobState, execution: JobLog) {
    return {
        jobStateId: state._id,
        executionId: execution._id,
        workerJobId: execution.workerJobId ?? execution._id,
        type: state.type,
        payload: execution.payload,
    };
}
