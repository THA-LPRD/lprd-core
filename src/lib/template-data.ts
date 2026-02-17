export {isTemplateData} from '../../convex/lib/template_data';
export type {DataField, DataFieldImage, DataFieldText, TemplateData} from '../../convex/lib/template_data';

/**
 * Flatten typed template data into a plain object suitable for Nunjucks rendering.
 * - `text` → its `value`
 * - `img`  → its `url` (which may already be a resolved Convex serving URL)
 */
export function resolveForRender(data: Record<string, {type: string; value?: string; url?: string}>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(data)) {
		if (field.type === 'text') {
			out[key] = field.value;
		} else if (field.type === 'img') {
			out[key] = field.url;
		}
	}
	return out;
}
