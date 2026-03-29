import { Worker } from 'bullmq';
import type { Id } from '@convex/dataModel';
import { internal } from '@convex/api';
import { config } from '@worker/config';
import { convexClient } from '@worker/convex-client';

interface HealthCheckJob {
    pluginId: Id<'applications'>;
    baseUrl: string;
}

interface HealthResponse {
    status: string;
    version?: string;
}

export function startWorker() {
    const worker = new Worker<HealthCheckJob>(
        config.healthCheck.queueName,
        async (job) => {
            const { pluginId, baseUrl } = job.data;
            const url = `${baseUrl}/health`;
            const start = Date.now();

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), config.healthCheck.timeoutMs);

                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);

                const responseTimeMs = Date.now() - start;

                if (res.ok) {
                    const body = (await res.json()) as HealthResponse;
                    const isHealthy = body.status === 'healthy';

                    await convexClient.mutation(internal.plugins.health.recordHealthCheck, {
                        pluginId,
                        status: isHealthy ? 'healthy' : 'unhealthy',
                        responseTimeMs,
                        pluginVersion: body.version,
                        errorMessage: isHealthy ? undefined : `Plugin reported status: ${body.status}`,
                    });

                    console.log(`[worker] ${pluginId}: ${isHealthy ? 'healthy' : 'unhealthy'} (${responseTimeMs}ms)`);
                } else {
                    await convexClient.mutation(internal.plugins.health.recordHealthCheck, {
                        pluginId,
                        status: 'unhealthy',
                        responseTimeMs,
                        errorMessage: `HTTP ${res.status} ${res.statusText}`,
                    });

                    console.log(`[worker] ${pluginId}: unhealthy - HTTP ${res.status} (${responseTimeMs}ms)`);
                }
            } catch (err) {
                const responseTimeMs = Date.now() - start;
                const message = err instanceof Error ? err.message : String(err);

                try {
                    await convexClient.mutation(internal.plugins.health.recordHealthCheck, {
                        pluginId,
                        status: 'error',
                        responseTimeMs,
                        errorMessage: message,
                    });
                } catch (recordErr) {
                    console.error(`[worker] ${pluginId}: failed to record health check:`, recordErr);
                }

                console.error(`[worker] ${pluginId}: error - ${message} (${responseTimeMs}ms)`);
                // Don't re-throw — the error was recorded, the job is done
            }
        },
        { connection: config.redis, concurrency: 10 },
    );

    worker.on('failed', (job, err) => {
        console.error(`[worker] Job ${job?.id ?? 'unknown'} failed:`, err.message);
    });

    return worker;
}
