import nunjucks from 'nunjucks';
import DOMPurify from 'dompurify';

/**
 * Base CSS applied to both Shadow DOM preview and Playwright render page.
 * Uses --font-inter CSS variable set by root layout's Inter Tight font.
 */
export const TEMPLATE_BASE_CSS = 'font-family: var(--font-inter, sans-serif); color: #000; background: white;';

const env = new nunjucks.Environment(null, {autoescape: true})

/**
 * Render a Nunjucks template with data, then sanitize the output with DOMPurify.
 * Throws on render errors — callers should catch and display error UI.
 */
export function renderAndSanitize(html: string, data: Record<string, unknown>): string {
    const rendered = env.renderString(html, data)
    return DOMPurify.sanitize(rendered)
}
