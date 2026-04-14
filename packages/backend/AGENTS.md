# packages/backend — Agent Guide

Workspace guide for `packages/backend` (Convex backend).

## Purpose

`packages/backend` is the single source of truth for all data, data integrity, and permissions. All domain state lives here — schema, queries, mutations, real-time subscriptions, and WorkOS identity syncing via webhooks.

Convex functions here handle atomicity and consistency: keeping related tables in sync within a single transaction (e.g. `jobStates` + `jobLogs` + `device.latestJob`), enforcing valid state transitions (only pending jobs can be started, only failed jobs can be retried), and permission checks at the data layer. They are not where orchestration logic lives — that belongs in core's API endpoints.

**Key rule — where mutations live:** UI components do not call Convex mutations directly, except for trivially simple updates or cases where optimistic writes give meaningful UX benefit. Writes go through core's API layer (`/api/v2/...`). The endpoint owns the orchestration: auth, input validation, coordinating multiple Convex calls, triggering side effects (job dispatch, file uploads, external calls). This makes flows self-documenting (feature → API path → resource → handler) and prevents orchestration from being scattered across UI files.

Come here to:
- Change schema (`convex/schema.ts`)
- Add or modify queries, mutations, and actions
- Update permissions or authorization rules (`convex/lib/permissions/`)
- Change WorkOS webhook handling for user/org events

## Mandatory first step

Before editing Convex code, read:

- `packages/backend/convex/_generated/ai/guidelines.md`

This file contains Convex-specific rules that override generic assumptions.

## Commands

Run from `packages/backend`:

- `bun dev` - start Convex dev server (avoid unless user asks)
- `bun setup` - run Convex dev until success
- `bun typecheck` - typecheck Convex TS project
- `bun lint` - Oxlint + Biome lint checks
- `bun lint:fix` - apply autofixable Oxlint + Biome fixes

## Code organization

- Keep schema changes in `convex/schema.ts`.
- Keep HTTP routing in `convex/http.ts`; implement handlers in domain folders (for example `convex/workos/*`).
- Keep shared backend utilities under `convex/lib/*`.
- Treat `convex/_generated/*` as generated output.

## Auth independence

Convex is a separate trust boundary from `apps/core`. Every query, mutation, and action must verify permissions for itself — never assume that because a request reached Convex it was already validated by the API layer. Core cannot know what Convex will accept, and Convex cannot know what core already checked. Each enforces independently.

## Function and API conventions

- Use explicit validators for function args.
- Keep internal and public function boundaries clear (`internal*` vs public `query`/`mutation`/`action`).
- Prefer explicit endpoints over action-multiplexed payloads.
- Keep webhook verification and secret usage centralized in WorkOS helper modules.

## Monorepo coordination

- `apps/core` and `apps/worker` consume generated API/contracts; communicate schema or payload changes in the same PR.
- If you change backend payload shape, update `packages/shared` types as needed.
