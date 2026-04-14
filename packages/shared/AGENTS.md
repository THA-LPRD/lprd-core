# packages/shared — Agent Guide

Workspace guide for `packages/shared` (shared types and utilities).

## Purpose

`packages/shared` is the contract layer between `apps/core` and `apps/worker`. It exists to prevent type drift and duplication across the two apps.

If both core and worker need to know about something — job payload shapes, render target selectors, auth token helpers, base fetch utilities — it lives here. Neither app duplicates it. Come here before adding any type or utility that both workspaces would otherwise define independently.

## Ownership model

This package is a **read-only runtime library** for `apps/core` and `apps/worker`:

- Do **not** add file-system I/O, network calls (except pure auth token exchange), or side effects.
- Do **not** import from app or worker workspaces; this creates circular dependencies.
- **Keep it lightweight and portable.**

## Code organization

- `src/api-client.ts` — base fetch + JSON parsing helpers for HTTP calls
- `src/auth-errors.ts` — WorkOS auth error mappings
- `src/jobs/` — job queue payload types and key generation
- `src/render/` — HTML rendering constants (selectors, base CSS, etc.)
- `src/workos/` — WorkOS token exchange and JWT utilities
- `src/template.ts` — template rendering helpers

## Changes that affect consumers

When you modify:

- Job type definitions in `src/jobs/types.ts` → update `apps/core` and `apps/worker` references
- Render constants → update renders in both app and worker
- Auth error mappings → test against WorkOS webhook/OAuth flows in app + worker

Communicate multi-workspace changes in the same PR.

## Prefer types over runtime

When possible, define pure TypeScript types here and let consumers implement their own side effects.
