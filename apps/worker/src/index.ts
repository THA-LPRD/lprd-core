import { config } from '@worker/config';
import { startScheduler } from '@worker/scheduler';
import { startWorker } from '@worker/worker';

function validateConfig() {
    if (!config.app.workerClientId || !config.app.workerClientSecret) {
        throw new Error('WORKER_CLIENT_ID and WORKER_CLIENT_SECRET environment variables are required');
    }
    if (!config.app.baseUrl) {
        throw new Error('CORE_BASE_URL or NEXT_PUBLIC_APP_URL environment variable is required');
    }
    if (!config.app.workosAuthkitDomain) {
        throw new Error('WORKOS_AUTHKIT_DOMAIN environment variable is required');
    }
}

async function main() {
    validateConfig();
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
