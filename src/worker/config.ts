export const config = {
    redis: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
    },
    convex: {
        url: process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? '',
        deployKey: process.env.CONVEX_DEPLOY_KEY ?? '',
    },
    scheduler: {
        intervalMs: 30_000,
    },
    app: {
        baseUrl: process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        workerClientId: process.env.WORKER_CLIENT_ID ?? '',
        workerClientSecret: process.env.WORKER_CLIENT_SECRET ?? '',
    },
    jobs: {
        queueName: 'app-jobs',
    },
    healthCheck: {
        timeoutMs: 10_000,
        schedulerQueueName: 'health-check-scheduler',
    },
} as const;
