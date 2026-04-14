# apps/worker

BullMQ worker workspace for screenshot rendering and application health checks.

## What lives here

- Worker entrypoint: `src/index.ts`
- Job scheduler: `src/scheduler.ts`
- Job processor: `src/worker.ts`
- Playwright thumbnail/render helper: `src/lib/render/thumbnail.ts`

## Local development

From repo root:

```bash
bun install
cp apps/worker/.env.example apps/worker/.env
```

Start required services first:

1. Redis/Valkey
2. `apps/core` app server

Then run worker:

```bash
cd apps/worker
bun dev
```

## Env vars

| Key                     | Default                 | Description                                             |
|-------------------------|-------------------------|---------------------------------------------------------|
| `CORE_BASE_URL`         | `http://localhost:3000` | Base URL of the core app, used for job status callbacks |
| `WORKOS_AUTHKIT_DOMAIN` | —                       | WorkOS AuthKit domain, used for M2M token exchange      |
| `WORKER_CLIENT_ID`      | —                       | WorkOS M2M client ID for worker auth                    |
| `WORKER_CLIENT_SECRET`  | —                       | WorkOS M2M client secret for worker auth                |
| `REDIS_HOST`            | `127.0.0.1`             | Redis/Valkey host                                       |
| `REDIS_PORT`            | `6379`                  | Redis/Valkey port                                       |
| `REDIS_PASSWORD`        | *(unset)*               | Redis/Valkey password, optional                         |

## Related docs

- Monorepo overview: `README.md`
- Worker coding conventions: `apps/worker/AGENTS.md`

