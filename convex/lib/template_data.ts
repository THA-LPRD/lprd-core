/** A plain text field. */
export type DataFieldText = { type: 'text'; value: string };

/** An image field — `storageId` is set after server-side processing. */
export type DataFieldImage = { type: 'img'; url: string; storageId?: string };

/** A single data field in a template's sample/plugin data. */
export type DataField = DataFieldText | DataFieldImage;

/** The top-level data shape stored in `sampleData` / `pluginData.data`. */
export type TemplateData = Record<string, DataField>;

export function isTemplateData(value: unknown): value is TemplateData {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    for (const field of Object.values(value as Record<string, unknown>)) {
        if (typeof field !== 'object' || field === null) return false;
        const f = field as Record<string, unknown>;
        if (f.type === 'text' && typeof f.value === 'string') continue;
        if (f.type === 'img' && typeof f.url === 'string') continue;
        return false;
    }
    return true;
}

/** Resolve img storageId → serving URL, returning a new data object. */
export async function resolveImageUrls(
    ctx: { storage: { getUrl: (id: string) => Promise<string | null> } },
    data: TemplateData,
): Promise<TemplateData> {
    const resolved = { ...data };
    for (const [key, field] of Object.entries(resolved)) {
        if (field.type === 'img' && field.storageId) {
            const url = await ctx.storage.getUrl(field.storageId);
            if (url) {
                resolved[key] = { ...field, url };
            }
        }
    }
    return resolved;
}

/** Delete all storage blobs referenced by img fields. */
export async function deleteImageBlobs(
    ctx: { storage: { delete: (id: string) => Promise<void> } },
    data: unknown,
): Promise<void> {
    if (!isTemplateData(data)) return;
    for (const field of Object.values(data)) {
        if (field.type === 'img' && field.storageId) {
            await ctx.storage.delete(field.storageId);
        }
    }
}
