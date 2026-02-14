import { startScheduler } from '@worker/scheduler';
import { startWorker } from '@worker/worker';

async function main() {
    console.log('[worker] Starting health check worker...');

    const { worker: schedulerWorker, queue: schedulerQueue } = await startScheduler();
    const healthWorker = startWorker();

    console.log('[worker] Scheduler and health check worker running');

    async function shutdown() {
        console.log('\n[worker] Shutting down...');
        await Promise.all([schedulerWorker.close(), healthWorker.close(), schedulerQueue.close()]);
        console.log('[worker] Shutdown complete');
        process.exit(0);
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('[worker] Fatal error:', err);
    process.exit(1);
});
