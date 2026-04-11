import type { Id } from '../_generated/dataModel';

export type LatestJobState = {
    status: 'pending' | 'paused' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    updatedAt: number;
    errorMessage?: string;
    jobId?: Id<'jobLogs'>;
    jobStateId?: Id<'jobStates'>;
    executionId?: Id<'jobLogs'>;
};
