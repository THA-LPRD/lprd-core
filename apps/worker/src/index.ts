import { makeLoggerLayer } from '@workspace/observability';
import { AppClient, AppClientLive } from '@worker/app-client';
import { WorkerConfig, WorkerConfigLive, type WorkerConfigShape } from '@worker/config';
import { FailureReporter, FailureReporterLive } from '@worker/failure-reporter';
import { createAppJobsQueue } from '@/lib/queue';
import { Renderer, RendererLive } from '@worker/renderer';
import { startScheduler } from '@worker/scheduler';
import { startWorker } from '@worker/worker';
import { Effect, Layer, ManagedRuntime } from 'effect';

const appClientLayer = AppClientLive.pipe(Layer.provide(WorkerConfigLive));
const rendererLayer = RendererLive.pipe(Layer.provide(appClientLayer));
const failureReporterLayer = FailureReporterLive.pipe(Layer.provide(appClientLayer));
const workerLayer = Layer.mergeAll(
    WorkerConfigLive,
    appClientLayer,
    rendererLayer,
    failureReporterLayer,
    makeLoggerLayer(),
);

type WorkerRuntime = ManagedRuntime.ManagedRuntime<WorkerConfig | AppClient | Renderer | FailureReporter, unknown>;

async function main() {
    const runtime: WorkerRuntime = ManagedRuntime.make(workerLayer);
    let config: WorkerConfigShape;

    try {
        config = await runtime.runPromise(WorkerConfig);
    } catch (error) {
        await runtime.dispose();
        throw error;
    }

    await runtime.runPromise(Effect.log('Starting health check worker'));
    const appJobsQueue = createAppJobsQueue(config);

    try {
        const { worker: schedulerWorker, queue: schedulerQueue } = await startScheduler(runtime, config, appJobsQueue);
        const healthWorker = startWorker(runtime, config);
        await runtime.runPromise(Effect.log('Scheduler and health check worker running'));

        let shuttingDown = false;
        const shutdown = async () => {
            if (shuttingDown) return;
            shuttingDown = true;
            await runtime.runPromise(Effect.log('Shutting down...'));
            await Promise.all([
                schedulerWorker.close(),
                healthWorker.close(),
                schedulerQueue.close(),
                appJobsQueue.close(),
            ]);
            await runtime.dispose();
            process.exit(0);
        };

        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    } catch (error) {
        await appJobsQueue.close();
        await runtime.dispose();
        throw error;
    }
}

main().catch((error) => {
    void Effect.runPromise(
        Effect.logError(`Fatal startup error: ${error instanceof Error ? error.message : String(error)}`).pipe(
            Effect.provide(makeLoggerLayer()),
        ),
    ).finally(() => process.exit(1));
});
