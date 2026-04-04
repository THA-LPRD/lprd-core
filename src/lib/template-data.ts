export { isImgFunc, containsImgFuncs, extractImageUrls, replaceImgUrls } from '../../convex/lib/template_data';

const IMG_FUNC_RE = /^img\((.+)\)$/;

/**
 * Recursively resolve `img(url)` markers → raw URL for Nunjucks rendering.
 * Strips `_imageBlobs` metadata key.
 * Passes through primitives (numbers, booleans, null) unchanged.
 */
export function resolveForRender(data: unknown): unknown {
    if (typeof data === 'string') {
        const match = IMG_FUNC_RE.exec(data);
        return match ? match[1] : data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => resolveForRender(item));
    }
    if (typeof data === 'object' && data !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
            if (key === '_imageBlobs') continue;
            result[key] = resolveForRender(val);
        }
        return result;
    }
    return data;
}

export type SimpleRow = { key: string; value: string };

/**
 * Parse a bracket notation path into segments.
 * `foo` → ["foo"]
 * `foo["bar"]` → ["foo", "bar"]
 * `foo[0]` → ["foo", 0]
 * `foo[0]["name"]` → ["foo", 0, "name"]
 */
export function parsePath(path: string): (string | number)[] {
    const segments: (string | number)[] = [];
    let i = 0;
    const len = path.length;

    // Read initial bare key (before any bracket)
    if (i < len && path[i] !== '[') {
        let key = '';
        while (i < len && path[i] !== '[') {
            key += path[i];
            i++;
        }
        segments.push(key);
    }

    while (i < len) {
        if (path[i] !== '[') break;
        i++; // skip '['

        if (i < len && path[i] === '"') {
            // String key: ["key"]
            i++; // skip opening "
            let key = '';
            while (i < len && path[i] !== '"') {
                key += path[i];
                i++;
            }
            i++; // skip closing "
            i++; // skip ]
            segments.push(key);
        } else {
            // Numeric index: [0]
            let num = '';
            while (i < len && path[i] !== ']') {
                num += path[i];
                i++;
            }
            i++; // skip ]
            const n = Number(num);
            segments.push(Number.isNaN(n) ? num : n);
        }
    }

    return segments;
}

/**
 * Flatten nested JSON to bracket notation rows.
 * Strips `_imageBlobs` metadata key.
 */
export function jsonToRows(data: unknown): SimpleRow[] {
    const rows: SimpleRow[] = [];

    function walk(node: unknown, prefix: string) {
        if (Array.isArray(node)) {
            if (node.length === 0) {
                rows.push({ key: prefix, value: '[]' });
                return;
            }
            for (let i = 0; i < node.length; i++) {
                walk(node[i], `${prefix}[${i}]`);
            }
        } else if (typeof node === 'object' && node !== null) {
            const entries = Object.entries(node as Record<string, unknown>);
            if (entries.length === 0) {
                // Only emit a row for nested empty objects, not the root
                if (prefix) rows.push({ key: prefix, value: '{}' });
                return;
            }
            for (const [key, val] of entries) {
                if (key === '_imageBlobs') continue;
                const childPrefix = prefix ? `${prefix}["${key}"]` : key;
                walk(val, childPrefix);
            }
        } else {
            rows.push({ key: prefix, value: String(node ?? '') });
        }
    }

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        walk(data, '');
    }

    return rows;
}

/**
 * Build nested JSON from bracket notation rows.
 * Strips `_imageBlobs` from output.
 */
export function rowsToJson(rows: SimpleRow[]): unknown {
    const root: Record<string, unknown> = {};

    for (const row of rows) {
        const trimmedKey = row.key.trim();
        if (!trimmedKey) continue;

        const segments = parsePath(trimmedKey);
        if (segments.length === 0) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let current: any = root;
        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            const nextSeg = segments[i + 1];
            if (current[seg] === undefined || current[seg] === null) {
                current[seg] = typeof nextSeg === 'number' ? [] : {};
            }
            current = current[seg];
        }

        const lastSeg = segments[segments.length - 1];

        // Ensure parent is an array if last segment is numeric
        if (typeof lastSeg === 'number' && !Array.isArray(current)) {
            // This shouldn't normally happen with well-formed keys
            current[lastSeg] = row.value;
        } else {
            current[lastSeg] = row.value;
        }
    }

    // Strip _imageBlobs
    delete root._imageBlobs;

    return root;
}
