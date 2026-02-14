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
    healthCheck: {
        timeoutMs: 10_000,
        queueName: 'plugin-health-checks',
        schedulerQueueName: 'health-check-scheduler',
    },
} as const;
