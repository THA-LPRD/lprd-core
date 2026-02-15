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
- `src/app/org/(app)/` - Org pages with sidebar/header layout (route group)
- `src/app/org/(bare)/` - Org pages without any wrapping layout (route group)
- `src/components/` - React components including UI components (shadcn/ui)
- `src/lib/` - Utility functions
- `src/worker/` - BullMQ health check worker (runs separately via `bun worker`)
- `convex/` - Convex backend functions and schema
- `convex/_generated/` - Auto-generated Convex types (do not edit)

### Route Groups (`src/app/org/`)

The `org/` route uses two route groups to control which pages get the sidebar/header layout:

- **`(app)`** — pages wrapped in the sidebar + header + breadcrumbs layout. All normal org pages live here.
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

### Org Context & Permissions

Pages under `src/app/org/(app)/[slug]/` are wrapped by a `[slug]/layout.tsx` that renders `<OrgProvider>`. This provider fetches the org, user, and members once, computes permissions, and exposes everything via React context.

- **Context**: `src/components/org/org-context.tsx` — `useOrg()` hook returns `{ org, user, members, currentMember, permissions }`
- **Provider**: `src/components/org/org-provider.tsx` — handles loading skeleton and `<OrgNotFound />` centrally
- **ACL**: `convex/lib/acl.ts` defines `getPermissions(user, membership)` → `Permissions` object; re-exported from `src/lib/acl.ts` for clean `@/lib/acl` imports

Pages should **not** fetch org/user/members themselves. Use `useOrg()` instead:

```tsx
const { org, permissions } = useOrg();

// Check permissions using the permissions object
if (permissions.device.manage) { /* show admin UI */ }
if (permissions.org.manage) { /* show settings */ }
if (permissions.template.manage) { /* show edit controls */ }
```

Permission keys: `platform.setUserRoles`, `org.{create,view,manage}`, `device.{view,manage}`, `template.{view,manage}`

**Note:** Only applies to `(app)` route group pages. `(bare)` pages and the org listing page (`src/app/org/(app)/page.tsx`) are not wrapped by this provider.

### Plugin System

- Plugins register via `POST /api/v2/plugin/register` (Convex httpAction)
- Action-based webhook endpoints use `X-Plugin-Id` header (not URL path):
  - `POST /api/v2/plugin/webhook/createTemplate` — upserts a global template
  - `POST /api/v2/plugin/webhook/data` — pushes org-scoped data
- Plugin health checks run via a BullMQ worker (`src/worker/`) that polls Convex for active plugins and hits their `/health` endpoint
- Plugin data is org-scoped — plugins specify `org_slug` in webhook payloads
- Auth is not yet implemented

### Template System

- Templates are HTML with Nunjucks/Jinja syntax, rendered with sample data for preview
- **Global templates** — created by plugins via the `createTemplate` webhook endpoint, immutable by users
- **Org templates** — created/edited/deleted by org admins, scoped to an organization
- Each template has one or more **variants**: `content` (w×h grid cells), `background`, or `foreground`
- One variant is marked **preferred** — rendered as a PNG thumbnail stored in Convex storage
- Template editor uses Shadow DOM for CSS isolation and DOMPurify for sanitization
- Code panel (`code-panel.tsx`) uses CodeMirror 6 (`@uiw/react-codemirror`) with HTML and JSON language modes, dark/light theme via `next-themes`, and inline linting (syntax errors via `@codemirror/language` syntax tree, Nunjucks template errors via `nunjucks.renderString`)
- Schema: `convex/schema.ts` (`templates` table), functions: `convex/templates.ts`
- Editor components: `src/components/template/editor/`
- Pages: `src/app/org/(app)/[slug]/templates/` (list) and `src/app/org/(app)/[slug]/templates/[id]/` (editor)

#### Shared Rendering Pipeline

All template rendering flows through a single module: `src/lib/template-document.ts`

- **`TEMPLATE_BASE_CSS`** — base CSS string (`font-family: var(--font-inter, sans-serif); color: #000; background: white;`) used by both Shadow DOM preview and the render page
- **`renderAndSanitize(html, data)`** — Nunjucks render + DOMPurify sanitize in one call; throws on render errors

Consumers:
- **Shadow DOM preview** (`shadow-preview.tsx`): injects `<style>:host { ${TEMPLATE_BASE_CSS} }</style>` and calls `renderAndSanitize()`
- **Render page** (`src/app/org/(bare)/[slug]/templates/render/[id]/page.tsx`): client component that fetches the template via `useQuery(api.templates.getById)`, renders into Shadow DOM (same as preview), and outputs clean HTML. Lives in the `(bare)` route group so it renders without sidebar/header chrome. Also usable as an iframe source.

#### Thumbnail Generation

Thumbnails are generated server-side via Playwright headless Chromium navigating to the render page.

- **API route**: `POST /api/v2/templates/createThumbnail` — accepts `{ templateId, orgSlug, variantIndex, width, height }`
- **Route file**: `src/app/api/v2/templates/createThumbnail/route.ts`
- Forwards the caller's auth cookies to Playwright so the render page authenticates
- Navigates to `/org/{orgSlug}/templates/render/{templateId}` and waits for `[data-rendered]`
- Screenshots at the specified viewport size → returns PNG
- Reuses a singleton browser instance across requests
- Called on template creation (list page) and on every Save (editor)
- Client uploads the returned PNG blob to Convex storage, then calls `storeThumbnail` mutation
- Requires `bunx playwright install chromium` for the Chromium binary

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

#### Empty States & Not Found

Use the predefined components from `src/components/ui/not-found.tsx` for not-found and access-denied states instead of inline JSX. These build on the `Empty` component (`src/components/ui/empty.tsx`).

- `<OrgNotFound />`, `<TemplateNotFound />`, `<DeviceNotFound />`, `<AccessDenied />` — zero-config presets
- All accept optional `backHref` and `backLabel` props to render a back button
- Use `<NotFound title="..." description="..." />` for one-off cases

```tsx
// Simple usage
if (!org) return <OrgNotFound />

// With back button
if (!device) return <DeviceNotFound backHref={`/org/${slug}/devices`} backLabel="Back to devices" />
```

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

#### No `asChild` — Base-UI uses `render`

Base-UI does **not** support the `asChild` prop (that's a Radix concept). Passing `asChild` to a Base-UI component like `TooltipTrigger` will:
1. Forward it as a DOM attribute, causing: `React does not recognize the 'asChild' prop on a DOM element`
2. Still render its default `<button>`, causing nested button errors

**Always use the `render` prop instead:**

```tsx
// BAD - asChild doesn't work with Base-UI
<TooltipTrigger asChild>
    <Button>Click</Button>
</TooltipTrigger>

// GOOD - render prop changes the trigger's element
// nativeButton={false} silences the "not a native <button>" warning
<TooltipTrigger render={<span />}>
    <Button render={<div />} nativeButton={false}>Click</Button>
</TooltipTrigger>
```