import {Queue, Worker} from 'bullmq';
import {config} from '@worker/config';
import {convexClient} from '@worker/convex-client';
import {healthCheckQueue} from '@worker/queue';
import {internal} from '@convex/api';

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
			const duePlugins = await convexClient.query(internal.plugins.listDueForHealthCheck);

			if (duePlugins.length === 0) {
				console.log('[scheduler] No plugins due for health check');
				return;
			}

			console.log(`[scheduler] ${duePlugins.length} plugin(s) due for health check`);

			await healthCheckQueue.addBulk(
				duePlugins.map((plugin) => ({
					name: 'health-check',
					data: {pluginId: plugin._id, baseUrl: plugin.baseUrl},
					opts: {jobId: `hc-${plugin._id}`},
				})),
			);
		},
		{connection: config.redis},
	);

	return {worker, queue: schedulerQueue};
}