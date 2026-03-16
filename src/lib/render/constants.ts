import type { TemplateVariant } from '@/lib/template';

export const GRID_COLS = 10;
export const GRID_ROWS = 6;
export const DEFAULT_CELL_SIZE = 80; // px, for editor/thumbnail

/**
 * Compute pixel dimensions from a template variant.
 */
export function getVariantPixelSize(variant: TemplateVariant): { width: number; height: number } {
    if (variant.type === 'content') {
        return { width: variant.w * DEFAULT_CELL_SIZE, height: variant.h * DEFAULT_CELL_SIZE };
    }
    return { width: GRID_COLS * DEFAULT_CELL_SIZE, height: GRID_ROWS * DEFAULT_CELL_SIZE };
}
