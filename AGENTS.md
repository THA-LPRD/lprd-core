# Monorepo Agent Guide

Read this file first, then read the workspace-local `AGENTS.md` before changing code.

## Workspace-specific guides

- `apps/core/AGENTS.md` - Next.js app and route/API conventions
- `apps/worker/AGENTS.md` - worker queue/scheduler/rendering conventions
- `packages/backend/AGENTS.md` - Convex backend conventions
- `packages/shared/AGENTS.md` - shared types and utilities conventions
- `packages/ui/AGENTS.md` - UI component library conventions

## Build/Test commands

Always use `bun`.

- `bun dev` - run workspace `dev` tasks with Turborepo (avoid unless user asks)
- `bun typecheck` - run TypeScript type checks across workspaces
- `bun lint` - Oxlint + Biome checks across workspaces
- `bun lint:fix` - apply autofixable Oxlint + Biome fixes across workspaces
- `bun format` - format repository files with Biome across workspaces

Do not run `bun run build` unless explicitly asked (CI-only).

## Monorepo architecture

- `apps/core` - Next.js 16 frontend and API routes
- `apps/worker` - BullMQ worker for rendering and health checks
- `packages/backend` - Convex schema, queries/mutations/actions, and HTTP webhooks
- `packages/shared` - runtime-shared TypeScript modules used by app/worker
- `packages/ui` - reusable UI components

## Rules that apply everywhere

- Keep changes scoped to the owning workspace.
- Prefer `@/*`, `@shared/*`, and Convex aliases where configured; avoid long relative imports.
- Keep API shapes explicit (dedicated endpoints over multiplexed `{ action: ... }` payloads).
- Prefer clean final architecture over temporary shortcuts.
- **Auth is independent per system.** `apps/core` and `packages/backend` (Convex) are separate trust boundaries. Each must verify auth and permissions for every operation it performs. Convex does not assume core already checked, and core does not assume Convex will catch it. There is no "it passed the API so it must be fine" — that reasoning is invalid because neither system can know the state of the other.




<!-- convex-ai-start -->

# Notes on Convex

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
