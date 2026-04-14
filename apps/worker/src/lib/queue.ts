import { Queue } from 'bullmq';
import { config } from '@worker/config';
import type { WorkerJobPayload } from '@shared/jobs';

export const appJobsQueue = new Queue<WorkerJobPayload>(config.jobs.queueName, {
    connection: config.redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export async function enqueueWorkerJob(job: WorkerJobPayload, workerJobId: string) {
    await appJobsQueue.add(job.type as WorkerJobPayload['type'], job, {
        jobId: workerJobId,
        removeOnComplete: true,
        removeOnFail: false,
    });
}
