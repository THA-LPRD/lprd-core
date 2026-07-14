import type { WorkerConfigShape } from '@worker/config';
import type { WorkerJobPayload } from '@shared/jobs';
import { Effect } from 'effect';
import { Queue } from 'bullmq';

export function createAppJobsQueue(config: WorkerConfigShape): Queue<WorkerJobPayload> {
    return new Queue<WorkerJobPayload>(config.jobs.queueName, {
        connection: config.redis,
        defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
        },
    });
}

export function enqueueWorkerJob(queue: Queue<WorkerJobPayload>, job: WorkerJobPayload, workerJobId: string) {
    return Effect.tryPromise(() =>
        queue.add(job.type, job, {
            jobId: workerJobId,
            removeOnComplete: true,
            removeOnFail: false,
        }),
    ).pipe(Effect.asVoid);
}
