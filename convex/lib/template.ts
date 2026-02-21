/**
 * Shared domain types — usable in both Convex backend and Next.js frontend.
 * Frontend imports via `@/lib/types`.
 */

export type TemplateVariant =
    | { type: 'content'; w: number; h: number }
    | { type: 'background' }
    | { type: 'foreground' };
