import { Queue } from 'bullmq';
import { config } from '@worker/config';

export const healthCheckQueue = new Queue(config.healthCheck.queueName, {
    connection: config.redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
    },
});
