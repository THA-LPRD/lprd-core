import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload, type JWTVerifyResult } from 'jose';
import { getAuthkitOrigin } from '@/lib/workos/shared';

type WorkOSM2MClaims = JWTPayload & {
    org_id?: string;
    sub?: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function getRemoteJwks() {
    const discoveryUrl = `${getAuthkitOrigin()}/.well-known/openid-configuration`;
    const discovery = await fetch(discoveryUrl).then((response) => {
        if (!response.ok) throw new Error(`Failed to load WorkOS discovery document: ${response.status}`);
        return response.json() as Promise<{ issuer: string; jwks_uri: string }>;
    });

    let jwks = jwksCache.get(discovery.jwks_uri);
    if (!jwks) {
        jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
        jwksCache.set(discovery.jwks_uri, jwks);
    }

    return { issuer: discovery.issuer, jwks };
}

export async function getToken(input: { clientId: string; clientSecret: string; scope?: string }) {
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: input.clientId,
        client_secret: input.clientSecret,
    });

    if (input.scope) {
        body.set('scope', input.scope);
    }

    const response = await fetch(`${getAuthkitOrigin()}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to obtain WorkOS M2M token: ${response.status} ${text}`);
    }

    return response.json() as Promise<{ access_token: string; expires_in: number; token_type: string }>;
}

export async function verifyToken(token: string): Promise<JWTVerifyResult<WorkOSM2MClaims>> {
    const decoded = decodeJwt(token) as WorkOSM2MClaims;
    const clientId =
        decoded.sub ??
        (typeof decoded.aud === 'string' ? decoded.aud : Array.isArray(decoded.aud) ? decoded.aud[0] : undefined);

    if (!clientId) {
        throw new Error('WorkOS M2M token missing client identifier');
    }

    const { issuer, jwks } = await getRemoteJwks();

    return jwtVerify(token, jwks, {
        issuer,
        audience: clientId,
    });
}
