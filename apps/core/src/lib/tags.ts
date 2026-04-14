export function normalizeTag(value: string) {
    return value.trim().toLowerCase();
}

export function normalizeTags(values: readonly string[]) {
    const seen = new Set<string>();
    const tags: string[] = [];

    for (const value of values) {
        const tag = normalizeTag(value);
        if (tag && !seen.has(tag)) {
            seen.add(tag);
            tags.push(tag);
        }
    }

    return tags;
}

export function canAddTag(value: string, currentTags: readonly string[]) {
    const tag = normalizeTag(value);

    return Boolean(tag) && !normalizeTags(currentTags).includes(tag);
}
