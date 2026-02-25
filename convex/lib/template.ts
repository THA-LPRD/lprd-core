/**
 * Shared domain types — usable in both Convex backend and Next.js frontend.
 * Frontend imports via `@/lib/types`.
 */

export type TemplateVariant =
    | { type: 'content'; w: number; h: number }
    | { type: 'background' }
    | { type: 'foreground' };

export const STARTER_HTML = `<div>
  <style>
    .title { font-size: 1.2em; font-weight: bold; }
    .row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  </style>

  <div class="title">{{ title }}</div>
  <span>{{ message }}</span>

  <!-- Font Awesome solid (default) — fontawesome.com/icons?f=classic&s=solid -->
  <div class="row">
    <img-fa name="sun"></img-fa>
    <span>FA solid: sun</span>
  </div>

  <!-- Font Awesome regular — fontawesome.com/icons?f=classic&s=regular -->
  <div class="row">
    <img-fa name="heart" set="regular"></img-fa>
    <span>FA regular: heart</span>
  </div>

  <!-- Font Awesome brands — fontawesome.com/icons?f=brands -->
  <div class="row">
    <img-fa name="github" set="brands"></img-fa>
    <span>FA brands: github</span>
  </div>

  <!-- Lucide icon — lucide.dev/icons -->
  <div class="row">
    <img-lucide name="moon"></img-lucide>
    <span>Lucide: moon</span>
  </div>
</div>`;

export const STARTER_SAMPLE_DATA = {
    title: 'Hello World',
    message: 'Edit this template to get started.',
};
