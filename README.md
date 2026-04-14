# LPRD Core Monorepo

LPRD Core now runs as a Turborepo with separate workspaces for the web app, worker, backend (Convex), and shared packages.

## Workspace docs

- `apps/core` - Next.js 16 app (`apps/core/README.md`)
- `apps/worker` - BullMQ + Playwright worker (`apps/worker/README.md`)
- `packages/backend` - Convex schema/functions + webhooks (`packages/backend/README.md`)
- `packages/shared` - shared API/auth/render types
- `packages/ui` - shared UI component package
- `packages/typescript-config` - shared TS presets

## Quick start (local)

1. Install deps:

```bash
bun install
```

2. Copy env files and fill in values (see each workspace's `README.md` for variable reference):

```bash
cp apps/core/.env.example apps/core/.env.local
cp apps/worker/.env.example apps/worker/.env
cp packages/backend/.env.example packages/backend/.env
```

3. Start everything:

```bash
bun dev
```

Turborepo runs all three workspaces (Convex, Next.js, worker) together in the TUI.
