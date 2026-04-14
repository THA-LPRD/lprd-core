# apps/worker — Agent Guide

Workspace guide for `apps/worker` (BullMQ scheduler + renderer worker).

## Purpose

Next.js is stateless and request-scoped — it cannot run long-lived or periodic work. Worker handles everything that must not block a user request:

- **Rendering**: HTML→PNG via Playwright (template thumbnails, frame thumbnails, device display captures). These can take seconds per job; holding a request open is not viable, and rate-limiting becomes unpredictable when the user has to wait a variable number of seconds.
- **Plugin-triggered batch renders**: When a plugin pushes new data it may trigger renders across many devices simultaneously. Core accepts the incoming data, logs the jobs, and returns `200` immediately. Worker drains the queue at its own pace without making the plugin wait.
- **Periodic work**: Things that are trivial in a traditional long-running server but impossible in stateless Next.js — health-check polling, background timers, scheduled jobs. Worker runs the scheduler loop.

Come here to:
- Add new job types
- Change rendering logic or Playwright behavior
- Change health-check scheduling intervals
- Modify how job results and status are reported back to core

## Commands

Run from `apps/worker`:

- `bun dev` - run worker with watch mode (avoid unless user asks)
- `bun start` - run worker once
- `bun typecheck` - TypeScript checks
- `bun lint` - Oxlint + Biome lint checks
- `bun lint:fix` - apply autofixable Oxlint + Biome fixes

## Runtime model

- `src/index.ts` validates env, starts scheduler and worker, and handles shutdown.
- `src/scheduler.ts` polls due health checks and enqueues jobs.
- `src/worker.ts` processes render/health-check jobs and reports status back to app APIs.
- Queue names and intervals are centralized in `src/config.ts`.

## Dependencies and ownership

- Worker talks to app APIs through `workerRequestJson` in `src/app-client.ts`.
- Shared job types and helpers come from `@shared/*`.
- Do not duplicate shared payload/types in this workspace; extend `packages/shared` first.

## Env and infra assumptions

- Requires Redis-compatible backend (`REDIS_HOST`, `REDIS_PORT`, optional `REDIS_PASSWORD`).
- Requires core base URL and M2M credentials (`CORE_BASE_URL`, `WORKER_CLIENT_ID`, `WORKER_CLIENT_SECRET`, `WORKOS_AUTHKIT_DOMAIN`).
- Keep worker and app route contracts aligned when changing API payloads.

## Change discipline

- Preserve explicit job lifecycle updates (`/start`, `/fail`) for observability.
- Keep timeout/error handling behavior intact when refactoring execution flow.
- Prefer small, testable helpers over inlining complex queue logic.
