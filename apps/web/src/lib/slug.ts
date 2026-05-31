/**
 * Convert a string to a URL-safe slug.
 * Lowercase, replace non-alphanumeric sequences with hyphens, collapse and trim.
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Build a readable URL slug from an entity name and its Convex ID.
 * Example: "My Display" + "jz7f2k" → "my-display--jz7f2k"
 */
export function buildEntitySlug(name: string, id: string): string {
    return `${slugify(name)}--${id}`;
}

/**
 * Extract the raw Convex ID from a slug.
 * "my-display--jz7f2k" → "jz7f2k"
 */
export function extractId(slug: string): string {
    const parts = slug.split('--');
    return parts.at(-1) ?? slug;
}

/**
 * Extract a human-readable label from a slug for use in breadcrumbs.
 * "my-cool-display--id" → "My cool display"
 */
export function slugToLabel(slug: string): string {
    const parts = slug.split('--');
    if (parts.length < 2) return slug;
    const namePart = parts.slice(0, -1).join('--');
    if (!namePart) return slug;
    const humanized = namePart.replace(/-/g, ' ');
    return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}
