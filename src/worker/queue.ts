import { Queue } from 'bullmq';
import { config } from '@worker/config';
import type { WorkerJobPayload } from '@/lib/jobs';

const JOB_TIMEOUT: Record<WorkerJobPayload['type'], number> = {
    'normalize-images': 30_000,
    'template-thumbnail': 15_000,
    'frame-thumbnail': 15_000,
    'device-render': 15_000,
    'health-check': 30_000,
};

export const appJobsQueue = new Queue<WorkerJobPayload>(config.jobs.queueName, {
    connection: config.redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export async function enqueueWorkerJob(job: WorkerJobPayload, jobId: string) {
    await appJobsQueue.add(job.type, job, {
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
        timeout: JOB_TIMEOUT[job.type] ?? 60_000,
    });
}
