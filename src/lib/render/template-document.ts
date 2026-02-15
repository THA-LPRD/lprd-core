import nunjucks from 'nunjucks';
import DOMPurify from 'dompurify';
import { DEFAULT_CELL_SIZE } from '@/lib/render/constants';

/**
 * Get base CSS with a custom cell size and dimensions (for scaled rendering).
 */
export function getTemplateBaseCSS(cellSize = DEFAULT_CELL_SIZE, width?: number, height?: number): string {
    let css = `font-family: var(--font-inter, sans-serif); font-size: 16px; line-height: 1.5; color: #000; background: white; --cell-size: ${cellSize}px;`;
    if (width != null && height != null) {
        css += ` --width: ${width}; --height: ${height}; --width-px: ${width * cellSize}px; --height-px: ${height * cellSize}px;`;
    }
    return css;
}

const env = new nunjucks.Environment(null, { autoescape: true });

/**
 * Render a Nunjucks template with data, then sanitize the output with DOMPurify.
 * Throws on render errors — callers should catch and display error UI.
 */
export function renderAndSanitize(
    html: string,
    data: Record<string, unknown>,
    cellSize = DEFAULT_CELL_SIZE,
    width?: number,
    height?: number,
): string {
    const extra: Record<string, unknown> = { cellSize };
    if (width != null && height != null) {
        extra.width = width;
        extra.height = height;
        extra.widthPx = width * cellSize;
        extra.heightPx = height * cellSize;
    }
    const rendered = env.renderString(html, { ...data, ...extra });
    return DOMPurify.sanitize(rendered);
}
