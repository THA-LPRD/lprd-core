import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';

const ALG = 'ES256';
const ISSUER = 'lprd-core';

function getPrivateKeyPem(): string {
    const key = process.env.PLUGIN_JWT_PRIVATE_KEY;
    if (!key) throw new Error('PLUGIN_JWT_PRIVATE_KEY env var is required');
    return key.replace(/\\n/g, '\n');
}

function getPublicKeyPem(): string {
    const key = process.env.PLUGIN_JWT_PUBLIC_KEY;
    if (!key) throw new Error('PLUGIN_JWT_PUBLIC_KEY env var is required');
    return key.replace(/\\n/g, '\n');
}

/**
 * Sign a JWT for a plugin. No expiration — revocation is handled via tokenIssuedAt.
 */
export async function signPluginToken(pluginId: string): Promise<{ token: string; issuedAt: number }> {
    const privateKey = await importPKCS8(getPrivateKeyPem(), ALG);
    const issuedAt = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({})
        .setProtectedHeader({ alg: ALG })
        .setSubject(pluginId)
        .setIssuer(ISSUER)
        .setIssuedAt(issuedAt)
        .sign(privateKey);

    return { token, issuedAt };
}

/**
 * Verify a plugin JWT and extract claims.
 */
export async function verifyPluginToken(token: string): Promise<{ pluginId: string; issuedAt: number }> {
    const publicKey = await importSPKI(getPublicKeyPem(), ALG);

    const { payload } = await jwtVerify(token, publicKey, {
        issuer: ISSUER,
    });

    if (!payload.sub) throw new Error('JWT missing sub claim');

    return {
        pluginId: payload.sub,
        issuedAt: payload.iat ?? 0,
    };
}
