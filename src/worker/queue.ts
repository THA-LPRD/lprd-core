import { Queue } from 'bullmq';
import { config } from '@worker/config';

export const healthCheckQueue = new Queue(config.healthCheck.queueName, {
    connection: config.redis,
    defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
    },
});
