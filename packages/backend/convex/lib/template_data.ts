const IMG_FUNC_RE = /^img\((.+)\)$/;

/** Extract URL from `img(url)` string marker. Returns URL or null. */
export function isImgFunc(value: string): string | null {
    const match = IMG_FUNC_RE.exec(value);
    return match?.[1] ?? null;
}

/** Recursively collect all URLs from `img()` markers in any JSON tree. */
export function extractImageUrls(data: unknown): string[] {
    const urls: string[] = [];
    function walk(node: unknown) {
        if (typeof node === 'string') {
            const url = isImgFunc(node);
            if (url) urls.push(url);
        } else if (Array.isArray(node)) {
            for (const item of node) walk(item);
        } else if (typeof node === 'object' && node !== null) {
            for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
                if (key === '_imageBlobs') continue;
                walk(val);
            }
        }
    }
    walk(data);
    return urls;
}

/** Recursively check if any `img()` markers exist in the data. */
export function containsImgFuncs(data: unknown): boolean {
    if (typeof data === 'string') return IMG_FUNC_RE.test(data);
    if (Array.isArray(data)) return data.some((item) => containsImgFuncs(item));
    if (typeof data === 'object' && data !== null) {
        for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
            if (key === '_imageBlobs') continue;
            if (containsImgFuncs(val)) return true;
        }
    }
    return false;
}

/**
 * Recursively replace `img(externalUrl)` with `img(resolvedUrl)`.
 * `urlMap` maps original external URLs → `{ url: servingUrl, storageId }`.
 */
export function replaceImgUrls(data: unknown, urlMap: Map<string, { url: string; storageId: string }>): unknown {
    if (typeof data === 'string') {
        const originalUrl = isImgFunc(data);
        if (originalUrl) {
            const resolved = urlMap.get(originalUrl);
            if (resolved) return `img(${resolved.url})`;
        }
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => replaceImgUrls(item, urlMap));
    }
    if (typeof data === 'object' && data !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
            if (key === '_imageBlobs') {
                result[key] = val;
                continue;
            }
            result[key] = replaceImgUrls(val, urlMap);
        }
        return result;
    }
    return data;
}

/** Recursively collect storageIds from the `_imageBlobs` metadata field. */
export function collectStorageIds(data: unknown): string[] {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return [];
    const record = data as Record<string, unknown>;
    const blobs = record._imageBlobs;
    if (typeof blobs !== 'object' || blobs === null || Array.isArray(blobs)) return [];
    return Object.values(blobs as Record<string, unknown>).filter((v): v is string => typeof v === 'string');
}

/** Delete all storage blobs tracked in `_imageBlobs`. */
export async function deleteImageBlobs(
    ctx: { storage: { delete: (id: string) => Promise<void> } },
    data: unknown,
): Promise<void> {
    const ids = collectStorageIds(data);
    for (const id of ids) {
        await ctx.storage.delete(id);
    }
}
