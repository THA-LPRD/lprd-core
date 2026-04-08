import type { MutationCtx } from '../_generated/server';

const PUBLIC_ID_BYTES = 16;
const BASE32_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

function encodeBase32(bytes: Uint8Array) {
    let output = '';
    let buffer = 0;
    let bits = 0;

    for (const byte of bytes) {
        buffer = (buffer << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
    }

    return output;
}

function generateOpaqueSuffix() {
    const bytes = new Uint8Array(PUBLIC_ID_BYTES);
    crypto.getRandomValues(bytes);
    return encodeBase32(bytes);
}

async function generateUniquePublicId(
    ctx: MutationCtx,
    options: {
        prefix: 'actor' | 'site';
        table: 'actors' | 'sites';
    },
) {
    for (;;) {
        const publicId = `${options.prefix}_${generateOpaqueSuffix()}`;
        const existing = await ctx.db
            .query(options.table)
            .withIndex('by_publicId', (q) => q.eq('publicId', publicId))
            .unique();

        if (!existing) {
            return publicId;
        }
    }
}

export function generateActorPublicId(ctx: MutationCtx) {
    return generateUniquePublicId(ctx, { prefix: 'actor', table: 'actors' });
}

export function generateSitePublicId(ctx: MutationCtx) {
    return generateUniquePublicId(ctx, { prefix: 'site', table: 'sites' });
}
