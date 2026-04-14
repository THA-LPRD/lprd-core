# apps/core — Agent Guide

Workspace guide for `apps/core` (Next.js frontend + API route handlers).

## Purpose

`apps/core` is the product. It serves the user-facing UI, owns the REST API surface that external plugins talk to, and dispatches all async jobs to the worker queue. Without core there is no user, no session, no feature — every other workspace exists to support it.

Come here to:
- Add or change user-facing UI features and pages
- Add or change REST API endpoints (`src/app/api/v2/`)
- Handle plugin webhook callbacks from the API side
- Dispatch jobs to the worker queue (`src/lib/jobs/dispatch.ts`)
- Change auth, middleware, or unauthenticated path allowlists

## Build/Test Commands

Run from `apps/core`:

- `bun dev` - Next.js dev server (avoid unless user asks)
- `bun typecheck` - TypeScript checks
- `bun lint` - Oxlint + Biome lint checks
- `bun lint:fix` - apply autofixable Oxlint + Biome fixes

## Architecture boundaries

- Keep `src/app/**` for App Router concerns only (pages, layouts, route handlers, route-local helpers).
- Put reusable logic in `src/lib/**`, `src/components/**`, or `src/providers/**`.
- **Convex reads** (queries, subscriptions via hooks) are used directly in UI components — this is the whole point of Convex. Reactivity is the reason we use it over a plain database.
- **Convex mutations** for trivial/tight UI updates (a single field patch, an operation that benefits from optimistic writes) may be called directly from the UI when it makes sense.
- **Complex writes go through a core API endpoint** (`/api/v2/...`). The endpoint is where orchestration lives: auth check, permission check, input validation, coordinating multiple Convex calls, triggering side effects (file uploads, job dispatch, external calls). Convex functions handle atomicity and data consistency at the DB layer — they are not the orchestration layer. This keeps flows self-documenting (feature → API path → resource → handler) and prevents orchestration logic from being scattered across UI files or duplicated between them.

## Route/auth notes

- Auth middleware and unauthenticated path allowlist live in `src/proxy.ts`.
- WorkOS auth routes: `/sign-in`, `/sign-up`, `/callback`.
- Bearer-token API routes are explicitly allowlisted in middleware to avoid browser redirect auth behavior.
- **Core is a separate trust boundary from Convex.** Every API route must verify auth and permissions independently — never assume a request is safe because it "came from inside the app" or because Convex will re-check it. Each system owns its own enforcement.

## Site route groups

Under `src/app/site/`:

- `(app)` - wrapped app layout (sidebar/header flows)
- `(bare)` - no wrapping UI, used for render/screenshot endpoints

Route groups do not change URL paths.

## Import aliases (tsconfig)

- `@/*` -> `apps/core/src/*`
- `@convex/lib/*` -> `packages/backend/convex/lib/*`
- `@convex/*` -> `packages/backend/convex/_generated/*`
- `@shared/*` -> `packages/shared/src/*`

Prefer aliases over long relative imports.

## API shape conventions

- Prefer explicit, dedicated endpoints over multiplexed `{ action: ... }` payloads.
- Keep route names task-focused (`/start`, `/fail`, `/pause`, `/resume`, `/retry`) when behavior differs.
- If a shortcut would reduce clarity, choose the clearer final route structure.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->