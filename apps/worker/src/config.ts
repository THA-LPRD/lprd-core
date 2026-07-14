import { Context, Effect, Layer } from 'effect';

export type WorkerConfigShape = {
    readonly redis: {
        readonly host: string;
        readonly port: number;
        readonly password: string | undefined;
    };
    readonly scheduler: {
        readonly intervalMs: number;
    };
    readonly app: {
        readonly baseUrl: string;
        readonly workosAuthkitDomain: string;
        readonly workerClientId: string;
        readonly workerClientSecret: string;
    };
    readonly jobs: {
        readonly queueName: string;
        readonly timeoutMs: number;
    };
    readonly healthCheck: {
        readonly timeoutMs: number;
        readonly schedulerQueueName: string;
    };
};

export type AppClientConfig = {
    readonly baseUrl: string;
    readonly accessToken: string;
};

export class WorkerConfig extends Context.Service<WorkerConfig, WorkerConfigShape>()('WorkerConfig') {}

function makeConfig(): WorkerConfigShape {
    const config: WorkerConfigShape = {
        redis: {
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD || undefined,
        },
        scheduler: {
            intervalMs: 30_000,
        },
        app: {
            baseUrl: process.env.CORE_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
            workosAuthkitDomain: process.env.WORKOS_AUTHKIT_DOMAIN ?? '',
            workerClientId: process.env.WORKER_CLIENT_ID ?? '',
            workerClientSecret: process.env.WORKER_CLIENT_SECRET ?? '',
        },
        jobs: {
            queueName: 'app-jobs',
            // Whole-pipeline backstop (/start + render + upload); per-request and Playwright
            // timeouts are separate and tighter. Must cover cold compiles in dev.
            timeoutMs: Number(process.env.JOB_TIMEOUT_MS ?? 60_000),
        },
        healthCheck: {
            timeoutMs: 10_000,
            schedulerQueueName: 'health-check-scheduler',
        },
    };

    const missing = [
        !config.app.workerClientId && 'WORKER_CLIENT_ID',
        !config.app.workerClientSecret && 'WORKER_CLIENT_SECRET',
        !config.app.workosAuthkitDomain && 'WORKOS_AUTHKIT_DOMAIN',
    ].filter((name): name is string => Boolean(name));

    if (missing.length > 0) {
        throw new Error(`Missing required worker environment variables: ${missing.join(', ')}`);
    }

    return config;
}

export const WorkerConfigLive = Layer.effect(WorkerConfig, Effect.sync(makeConfig));
