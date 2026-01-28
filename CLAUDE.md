# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands

Always use `pnpm` to run scripts.

- `pnpm dev' - Start Next.js development server [Note: Don't use this unless otherwise told to]
- `pnpm lint` - Type-aware Oxlint linting (also reports TypeScript errors)
- `pnpm lint --fix` - Apply fixes for autofixable lint issues
- `pnpm dlx convex dev` - Start Convex backend [Note: Don't use this unless otherwise told to]

**Do not run:** `pnpm dev` (assume already running), `pnpm build` (CI only)

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
- `convex/` - Convex backend functions and schema
- `convex/_generated/` - Auto-generated Convex types (do not edit)

### Convex Backend

- Schema defined in `convex/schema.ts`
- Functions (queries, mutations, actions) go in `convex/*.ts` files
- Access authenticated user in Convex functions via `ctx.auth.getUserIdentity()`
- Import generated API types from `convex/_generated/api`

### UI Components

Using shadcn/ui with Base-ui. Add components via:
```bash
pnpm dlx shadcn@latest add <component-name>
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