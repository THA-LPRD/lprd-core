# packages/ui

Reusable shadcn/ui components and design system for LPRD.

## What lives here

- Base UI components (buttons, cards, dialogs, etc.)
- Form field wrappers (Field, FieldLabel, FieldGroup)
- Theme provider and CSS variables
- Tailwind CSS v4 styling

## Local development

From repo root:

```bash
bun install
```

This is a library package; it does not have a dev server.

## Adding components

Use shadcn to add components:

```bash
cd packages/ui
bunx shadcn@latest add <component-name>
```

## Design

- Base-UI headless components
- Tailwind CSS v4 with CSS variables for theming
- Composition-first, props-minimal approach
- Use `render` prop for flexibility

## Related docs

- Monorepo overview: `README.md`
- UI conventions: `packages/ui/AGENTS.md`

