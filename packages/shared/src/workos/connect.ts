import { createRemoteJWKSet, type JWTPayload, jwtVerify, type JWTVerifyResult } from 'jose';
import { AuthError } from '../auth-errors';
import { getAuthkitOrigin } from './shared';

type WorkOSM2MClaims = JWTPayload & {
    org_id?: string;
    sub?: string;
};

const DISCOVERY_TTL_MS = 5 * 60 * 1000; // 5 minutes

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
let discoveryCache: { issuer: string; jwks: ReturnType<typeof createRemoteJWKSet>; expiresAt: number } | null = null;

async function getRemoteJwks() {
    const now = Date.now();
    if (discoveryCache && discoveryCache.expiresAt > now) {
        return { issuer: discoveryCache.issuer, jwks: discoveryCache.jwks };
    }

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

    discoveryCache = { issuer: discovery.issuer, jwks, expiresAt: now + DISCOVERY_TTL_MS };

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
    const expectedAudience = process.env.WORKOS_CLIENT_ID;
    if (!expectedAudience) {
        throw new Error('WORKOS_CLIENT_ID is required for token verification');
    }

    const { issuer, jwks } = await getRemoteJwks();

    return jwtVerify(token, jwks, {
        issuer,
        audience: expectedAudience,
    });
}

export function getBearerToken(authHeader: string | null): string | null {
    if (!authHeader) {
        return null;
    }

    if (!authHeader.startsWith('Bearer ')) {
        throw new AuthError('Missing or invalid Authorization header', 401);
    }

    return authHeader.slice(7);
}

export async function requireVerifiedBearerToken(authHeader: string | null): Promise<string> {
    const token = getBearerToken(authHeader);
    if (!token) {
        throw new AuthError('Missing or invalid Authorization header', 401);
    }

    try {
        await verifyToken(token);
    } catch {
        throw new AuthError('Invalid or expired token', 401);
    }

    return token;
}
