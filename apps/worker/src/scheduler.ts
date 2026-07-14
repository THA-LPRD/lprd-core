import { generateRequestId, withLogFields, withLoggedSpan, withRequestLogContext } from '@workspace/observability';
import { AppClient } from '@worker/app-client';
import type { WorkerServices } from '@worker/worker';
import type { WorkerConfigShape } from '@worker/config';
import { enqueueWorkerJob } from '@/lib/queue';
import type { HealthCheckPayload, WorkerJobPayload } from '@shared/jobs';
import { makeWorkKey } from '@shared/jobs';
import { Effect, type ManagedRuntime } from 'effect';
import { Queue, Worker } from 'bullmq';

type SchedulerRuntime = ManagedRuntime.ManagedRuntime<WorkerServices, unknown>;

function enqueueDueHealthChecks(queue: Queue<WorkerJobPayload>, requestId: string) {
    const program = Effect.gen(function* () {
        const appClient = yield* AppClient;
        const duePlugins = yield* appClient.requestJson<HealthCheckPayload[]>(
            '/api/v2/applications/health-checks/due',
            {
                requestId,
                retry: 'transient',
            },
        );

        for (const plugin of duePlugins) {
            yield* enqueueWorkerJob(
                queue,
                {
                    type: 'health-check',
                    payload: {
                        applicationId: plugin.applicationId,
                        actorId: plugin.actorId,
                        siteId: plugin.siteId,
                        baseUrl: plugin.baseUrl,
                    },
                },
                makeWorkKey('health-check', plugin.applicationId),
            );
        }
    });

    return withRequestLogContext(
        withLogFields(withLoggedSpan('scheduler.poll')(program), { 'job.type': 'health-check' }),
        { requestId },
    );
}

export async function startScheduler(
    runtime: SchedulerRuntime,
    config: WorkerConfigShape,
    appJobsQueue: Queue<WorkerJobPayload>,
) {
    const schedulerQueue = new Queue(config.healthCheck.schedulerQueueName, {
        connection: config.redis,
    });

    await schedulerQueue.upsertJobScheduler('poll-due-plugins', {
        every: config.scheduler.intervalMs,
    });

    const worker = new Worker(
        config.healthCheck.schedulerQueueName,
        () => runtime.runPromise(enqueueDueHealthChecks(appJobsQueue, generateRequestId())),
        { connection: config.redis },
    );

    return { worker, queue: schedulerQueue };
}
