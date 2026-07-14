import type { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { updateDeviceLatestJobState } from './deviceJobs';
import { updateFrameLatestJobState } from './frameJobs';
import { buildLatestJobState } from './jobStateMappers';
import { updateTemplateLatestJobState } from './templateJobs';

export const RUNNING_TIMEOUT_MS = 10 * 60 * 1000;
export const PENDING_TIMEOUT_MS = 60 * 60 * 1000;

const STALE_JOB_BATCH_SIZE = 50;
const nonTerminalStatuses = new Set(['pending', 'running', 'paused']);

type JobState = Doc<'jobStates'>;

function getStaleTimestamp(state: JobState) {
    return state.status === 'running' ? (state.startedAt ?? state.updatedAt) : (state.queuedAt ?? state.updatedAt);
}

async function updateLatestJob(ctx: MutationCtx, state: JobState, now: number, executionId?: Id<'jobLogs'>) {
    const latestJob = buildLatestJobState({
        status: 'failed',
        updatedAt: now,
        jobStateId: state._id,
        executionId,
        errorMessage: state.errorMessage,
    });

    switch (state.resourceType) {
        case 'device':
            await updateDeviceLatestJobState(ctx, state.resourceId as Id<'devices'>, latestJob);
            break;
        case 'template':
            await updateTemplateLatestJobState(ctx, state.resourceId as Id<'templates'>, latestJob);
            break;
        case 'frame':
            await updateFrameLatestJobState(ctx, state.resourceId as Id<'frames'>, latestJob);
            break;
    }
}

async function expireJob(ctx: MutationCtx, state: JobState, now: number) {
    const staleTimestamp = getStaleTimestamp(state);
    const errorMessage = `Expired by watchdog: job was ${state.status} with no status report since ${new Date(staleTimestamp).toISOString()}`;
    const execution = state.currentExecutionId ? await ctx.db.get(state.currentExecutionId) : null;

    if (execution && nonTerminalStatuses.has(execution.status)) {
        await ctx.db.patch(execution._id, {
            status: 'failed',
            finishedAt: now,
            errorMessage,
        });
    }

    await ctx.db.patch(state._id, {
        status: 'failed',
        updatedAt: now,
        finishedAt: now,
        errorMessage,
        ...(execution && {
            latestExecutionId: execution._id,
            latestFinishedExecutionId: execution._id,
        }),
    });

    await updateLatestJob(ctx, { ...state, errorMessage }, now, execution?._id);
    console.log(
        `Expired stale job: jobStateId=${state._id} type=${state.type} resourceId=${state.resourceId} staleStatus=${state.status}`,
    );
}

export const expireStaleJobs = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const staleRunning = await ctx.db
            .query('jobStates')
            .withIndex('by_status_and_updatedAt', (q) =>
                q.eq('status', 'running').lt('updatedAt', now - RUNNING_TIMEOUT_MS),
            )
            .take(STALE_JOB_BATCH_SIZE);
        const stalePending = await ctx.db
            .query('jobStates')
            .withIndex('by_status_and_updatedAt', (q) =>
                q.eq('status', 'pending').lt('updatedAt', now - PENDING_TIMEOUT_MS),
            )
            .take(STALE_JOB_BATCH_SIZE);

        let expired = 0;
        for (const state of [...staleRunning, ...stalePending]) {
            const timeout = state.status === 'running' ? RUNNING_TIMEOUT_MS : PENDING_TIMEOUT_MS;
            if (getStaleTimestamp(state) >= now - timeout) continue;

            await expireJob(ctx, state, now);
            expired += 1;
        }

        if (
            expired > 0 &&
            (staleRunning.length === STALE_JOB_BATCH_SIZE || stalePending.length === STALE_JOB_BATCH_SIZE)
        ) {
            await ctx.scheduler.runAfter(0, internal.jobs.watchdog.expireStaleJobs, {});
        }

        return { expired };
    },
});
