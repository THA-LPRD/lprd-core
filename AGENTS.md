# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build/Test Commands

Always use `bun` to run scripts.

- `bun dev` - Start Next.js development server [Note: Don't use this unless otherwise told to]
- `bun lint` - Type-aware Oxlint linting (also reports TypeScript errors)
- `bun lint --fix` - Apply fixes for autofixable lint issues
- `bunx convex dev` - Start Convex backend [Note: Don't use this unless otherwise told to]

**Do not run:** `bun dev` (assume already running), `bun run build` (CI only)

## Architecture

This is a Next.js 16 application with a Convex backend and WorkOS AuthKit authentication.

### Authentication Flow

- **Middleware** (`src/proxy.ts`): WorkOS AuthKit middleware protects routes. Unauthenticated paths: `/`, `/login`, `/sign-in`, `/sign-up`
- **Auth routes**: `/sign-in`, `/sign-up`, `/callback` handle WorkOS OAuth flow
- **Convex auth**: JWT tokens from WorkOS are validated by Convex via config in `convex/auth.config.ts`
- **Client integration**: `ConvexClientProvider` bridges WorkOS AuthKit with Convex's auth system using `ConvexProviderWithAuth`

### Key Directories

- `src/app/` - Next.js App Router pages and API routes
- `src/app/site/(app)/` - Site pages with sidebar/header layout (route group)
- `src/app/site/(bare)/` - Site pages without any wrapping layout (route group)
- `src/components/` - React components including UI components (shadcn/ui)
- `src/lib/` - Utility functions
- `src/worker/` - BullMQ health check worker (runs separately via `bun worker`)
- `convex/` - Convex backend functions and schema
- `convex/_generated/` - Auto-generated Convex types (do not edit)

### App Router Boundary

- Keep
  `src/app/**` limited to Next.js App Router concerns: pages, layouts, route handlers, loading/error files, and route-local helpers only.
- Do not place shared helpers, auth utilities, generic data mappers, or reusable business logic under `src/app/**`.
- Shared code belongs in directories like `src/lib/`, `src/components/`, or other non-App-Router modules.

### Route Groups (`src/app/site/`)

The `site/` route uses two route groups to control which pages get the sidebar/header layout:

- **`(app)`** — pages wrapped in the sidebar + header + breadcrumbs layout. All normal site pages live here.
- **`(bare)`** — pages with no wrapping UI. Used for standalone pages like the template render page (used by Playwright for screenshots).

Route groups don't affect URLs. To add a page that should render without the sidebar, place it under `(bare)/`.

### Path Aliases (tsconfig)

- `@/*` → `./src/*`
- `@convex/*` → `./convex/_generated/*`
- `@worker/*` → `./src/worker/*`

Always use these aliases instead of relative paths.

### Convex Backend

- Schema defined in `convex/schema.ts`
- Functions (queries, mutations, actions) go in `convex/*.ts` files
- Access authenticated user in Convex functions via `ctx.auth.getUserIdentity()`
- Import generated API types: `import {api} from "@convex/api"`, `import {internal} from "@convex/api"`, `import type {Id} from "@convex/dataModel"`
- Internal functions (`internalQuery`, `internalMutation`) are called via `internal.module.fn`, not `api.module.fn`
- HTTP endpoints (webhooks, plugin API) are `httpAction` handlers organized by domain: `convex/workos/`, `convex/plugin/`, routed in `convex/http.ts`

### Logging

All backend code uses **Effect** for structured logging. Never use raw `console.log` in backend code.

- **Logger module**: `src/lib/logger.ts` — exports an Effect `Logger` and a `withLogger` layer
- **Dev**: logs to console. **Prod**: ships structured JSON to Axiom (`AXIOM_TOKEN`, `AXIOM_DATASET` env vars)
- **Scope**: all Convex functions, Next.js API routes, and the BullMQ worker
- **Log levels**: `debug` (internal state), `info` (lifecycle), `warning` (recoverable), `error` (failures)

```ts
yield * Effect.logInfo('Plugin registered').pipe(Effect.annotateLogs({ pluginId, siteSlug }));
yield * Effect.logError('Render failed').pipe(Effect.annotateLogs({ deviceId, error: String(e) }));
```

### Site Context & Permissions

Pages under `src/app/site/(app)/[slug]/` are wrapped by a layout that renders `<SiteProvider>`. This provider fetches the site, user, and members once, computes permissions, and exposes everything via React context.

- **Context**: `src/components/site/site-context.tsx` — `useSite()` hook
- **Provider**: `src/components/site/site-provider.tsx` — handles loading skeleton and not-found centrally
- **ACL**: `convex/lib/acl.ts` defines `getPermissions(user, membership)` → `Permissions` object; re-exported from `src/lib/acl.ts`

Permission keys: `platform.setUserRoles`, `site.{create,view,manage}`, `device.{view,manage}`, `template.{view,manage}`, `plugin.{manage,siteManage}`

**Note:** Only applies to `(app)` route group pages. `(bare)` pages are not wrapped by this provider.

### Shared Domain Types (`convex/lib/` → `src/lib/`)

Pure TypeScript types, constants, and logic shared between Convex and Next.js live in `convex/lib/`. Each file is re-exported from a matching `src/lib/` file so components can use the `@/lib/` alias.

**Rule:** never duplicate these constants or types in components. Import from `@/lib/<name>` instead.

### API Design

- Prefer explicit, dedicated endpoints over multiplexed
  `action` payload endpoints when the actions are semantically distinct.
- Prefer routes like `/cancel`, `/pause`, `/resume`, `/retry` over `POST /resource/:id` with `{ action: ... }`.
- If a faster but less explicit API shape is tempting during a refactor, prefer the final clear route structure directly.
- Do not introduce temporary “internal command” endpoint shapes unless the user explicitly approves that tradeoff.

### Refactor Discipline

- When choosing between a quick patch and the proper final architecture, prefer the proper final architecture by default.
- Do not take implementation shortcuts solely to reduce file count when the result makes the API, ownership boundaries, or code layout less clear.
- If you are about to trade architecture clarity for speed, stop and ask first.

### Plugin System

**Two-phase authentication:**

1. AppAdmin creates a plugin slot via `/admin/plugins` → gets a one-time registration key
2. Plugin self-registers via `POST /api/v2/plugin/register` with the key → receives an ES256 JWT token
3. All subsequent API calls use `Authorization: Bearer <token>` header

**Three-level access control:**

1. **Global kill switch**: Plugin `status` field — if suspended, ALL sites lose access
2. **Per-site admin control**: `pluginSiteAccess.enabledByAdmin` — appAdmin can block specific sites
3. **Per-site user control**: `pluginSiteAccess.enabledBySite` — siteAdmin enables/disables for their site

Enforcement: JWT valid → plugin `active` → token not revoked → scope allowed → `enabledByAdmin` → `enabledBySite`

- Plugin data is keyed by `(pluginId, siteId, topic, entry)` — pushing the same key overwrites the previous record
- Plugin data is site-scoped — plugins specify `site_slug` in webhook payloads
- **Mock plugin script**: `./scripts/mock-plugin.sh` — set `REGISTRATION_KEY` and `AUTH_TOKEN` env vars

### Device–Frame–Plugin Integration

Devices display frames with live plugin data, pre-rendered as images.

**Data flow:** Plugins push data (topic + entry per site) → frames define layout (widgets + layers) → devices bind widgets to plugin data → Playwright renders image on data change (double-buffered as `current`/`next`).

**Convex images:** Convex storage URLs are allowed via `remotePatterns` in `next.config.ts` — use `next/image` as normal.

### Template System

- Templates are HTML with Nunjucks/Jinja syntax, rendered with sample data for preview
- **Global templates** — created by plugins, immutable by users
- **Site templates** — created/edited/deleted by site admins, scoped to a site
- Each template has one or more **variants**: `content`, `background`, or `foreground`
- Rendering pipeline: `src/lib/template-document.ts` (`renderAndSanitize`, `TEMPLATE_BASE_CSS`)
- Thumbnails generated via Playwright headless Chromium → `POST /api/v2/templates/createThumbnail`

### Worker (`src/worker/`)

- Runs separately from Next.js: `bun worker`
- Requires Redis and `CONVEX_DEPLOY_KEY` env var
- Polls every 30s for active plugins due for health check, enqueues BullMQ jobs

### UI Components

Using shadcn/ui with Base-ui. Add components via `bunx shadcn@latest add <component-name>`. Tailwind CSS v4 with CSS variables for theming.

#### Key Patterns

- **Empty states**: Use presets from `src/components/ui/not-found.tsx` (`<SiteNotFound />`, `<TemplateNotFound />`, `<DeviceNotFound />`, `<AccessDenied />`)
- **Nested buttons**: Base-UI triggers render `<button>` — use the `render` prop on inner components to avoid nesting: `<SidebarMenuButton render={<div />}>`
- **No `asChild`**: Base-UI uses `render` prop, not Radix's `asChild`
- **Form fields**: Use `Field`, `FieldLabel`, `FieldGroup` from `src/components/ui/field.tsx`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
