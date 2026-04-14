# packages/ui — Agent Guide

Workspace guide for `packages/ui` (component library).

## Purpose

`packages/ui` is the design system — pure, reusable, page-agnostic UI components. Most come from shadcn/ui; a few are custom. These components are not aware of the product domain.

Contrast with `apps/core/src/components/`: those are page-specific components built for a particular feature (device grid, template editor, frame picker, etc.). A component in `packages/ui` could appear on any page or in any app; a component in `apps/core/src/components/` is built for one specific use. Do not blur this line.

Come here when:
- Building something reusable that could appear on multiple pages
- Adding a new shadcn component
- Fixing visual consistency in base components or the design token layer

## Scope

UI library only — no business logic, no data fetching, no side effects.

## Component patterns

- **Empty states**: `src/empty.tsx` has presets (`SiteNotFound`, `AccessDenied`, etc.)
- **Form fields**: Use `Field`, `FieldLabel`, `FieldGroup` from `src/field.tsx`
- **Base-UI**: Use the `render` prop instead of Radix's `asChild`:
  ```tsx
  <SidebarMenuButton render={<div />}>Content</SidebarMenuButton>
  ```
- **Styling**: Tailwind v4 classes + CSS variables in `src/styles.css`

## Adding components

Run from `packages/ui`:

```bash
bunx shadcn@latest add <name>
```

The `components.json` here points shadcn to install into `packages/ui/src/`. Generated components import utilities as `@lprd/ui/lib/utils` — that alias is wired in `tsconfig.json` and resolves to `src/lib/utils.ts`.

Keep surface area small and composable.

## Guidelines

- No state management in components
- No routing or API calls
- Prefer Base-UI hooks over custom ones
- Scope CSS to component or use Tailwind
