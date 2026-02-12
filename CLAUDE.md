# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands

Always use `bun` to run scripts.

- `bun dev' - Start Next.js development server [Note: Don't use this unless otherwise told to]
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
- `src/components/` - React components including UI components (shadcn/ui)
- `src/lib/` - Utility functions
- `src/worker/` - BullMQ health check worker (runs separately via `bun worker`)
- `convex/` - Convex backend functions and schema
- `convex/_generated/` - Auto-generated Convex types (do not edit)

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

### Plugin System

- Plugins register via `POST /api/v2/plugin/register` (Convex httpAction)
- Plugins push data via `POST /api/v2/plugin/webhook/:pluginId` (Convex httpAction)
- Plugin health checks run via a BullMQ worker (`src/worker/`) that polls Convex for active plugins and hits their `/health` endpoint
- Plugin data is org-scoped — plugins specify `org_slug` in webhook payloads
- Auth is not yet implemented

### Worker (`src/worker/`)

- Runs separately from Next.js: `bun worker`
- Requires Redis and `CONVEX_DEPLOY_KEY` env var
- Scheduler polls every 30s for active plugins due for health check, enqueues BullMQ jobs
- Worker fetches `${plugin.baseUrl}/health`, records results in Convex

### UI Components

Using shadcn/ui with Base-ui. Add components via:
```bash
bunx shadcn@latest add <component-name>
```

Components use Tailwind CSS v4 with CSS variables for theming.

#### Nested Button Pitfall

Base-UI trigger components (`DropdownMenuTrigger`, `DialogTrigger`, etc.) render a `<button>` by default. Many sidebar/menu button components also render `<button>`. Nesting these causes hydration errors:

```
In HTML, <button> cannot be a descendant of <button>.
```

**Fix:** Use the `render` prop to make the inner component render as a `<div>`:

```tsx
// BAD - nested buttons
<DropdownMenuTrigger>
    <SidebarMenuButton>...</SidebarMenuButton>
</DropdownMenuTrigger>

// GOOD - inner component renders as div
<DropdownMenuTrigger>
    <SidebarMenuButton render={<div />}>...</SidebarMenuButton>
</DropdownMenuTrigger>
```

This applies to any component using `useRender` with `defaultTagName: "button"` when placed inside a Base-UI trigger.