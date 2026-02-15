import nunjucks from 'nunjucks';
import DOMPurify from 'dompurify';
import { DEFAULT_CELL_SIZE } from '@/lib/render/constants';

/**
 * Get base CSS with a custom cell size (for scaled rendering).
 */
export function getTemplateBaseCSS(cellSize = DEFAULT_CELL_SIZE): string {
    return `font-family: var(--font-inter, sans-serif); font-size: 16px; line-height: 1.5; color: #000; background: white; --cell-size: ${cellSize}px;`;
}

const env = new nunjucks.Environment(null, { autoescape: true });

/**
 * Render a Nunjucks template with data, then sanitize the output with DOMPurify.
 * Throws on render errors — callers should catch and display error UI.
 */
export function renderAndSanitize(html: string, data: Record<string, unknown>, cellSize = DEFAULT_CELL_SIZE): string {
    const rendered = env.renderString(html, { ...data, cellSize });
    return DOMPurify.sanitize(rendered);
}
