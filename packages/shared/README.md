# packages/shared

Shared runtime types and utilities used across `apps/core` and `apps/worker`.

## What lives here

- API client utilities: `src/api-client.ts`
- Auth error types: `src/auth-errors.ts`
- Job types and constants: `src/jobs/`
- Render constants: `src/render/`
- WorkOS auth/token helpers: `src/workos/`
- Template rendering utilities: `src/template.ts`

## Design

This package holds **shared types and pure utilities only** — no side effects, no external service calls (except within auth token exchange, which is isolated).

Dependencies from here should only flow into `apps/core` and `apps/worker`, never back out.

## Local development

From repo root:

```bash
bun install
```

No dev server needed; this is a library package.

## Related docs

- Monorepo overview: `README.md`
- Shared package conventions: `packages/shared/AGENTS.md`

