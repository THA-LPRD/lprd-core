import { Queue, Worker } from 'bullmq';
import { config } from '@worker/config';
import { enqueueWorkerJob } from '@/lib/jobs/dispatch';
import { makeJobKey } from '@/lib/jobs';
import { workerRequestJson } from '@worker/app-client';

const schedulerQueue = new Queue(config.healthCheck.schedulerQueueName, {
    connection: config.redis,
});

export async function startScheduler() {
    await schedulerQueue.upsertJobScheduler('poll-due-plugins', {
        every: config.scheduler.intervalMs,
    });

    const worker = new Worker(
        config.healthCheck.schedulerQueueName,
        async () => {
            const duePlugins = await workerRequestJson<
                Array<{
                    applicationId: string;
                    actorId: string;
                    siteId: string | null;
                    baseUrl: string;
                }>
            >('/api/v2/applications/health-checks/due');

            if (duePlugins.length === 0) {
                return;
            }

            for (const plugin of duePlugins) {
                await enqueueWorkerJob(
                    {
                        type: 'health-check',
                        payload: {
                            applicationId: plugin.applicationId,
                            actorId: plugin.actorId,
                            siteId: plugin.siteId,
                            baseUrl: plugin.baseUrl,
                        },
                    },
                    makeJobKey('health-check', plugin.applicationId),
                );
            }
        },
        { connection: config.redis },
    );

    return { worker, queue: schedulerQueue };
}
