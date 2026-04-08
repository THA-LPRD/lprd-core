import { requestJson } from '@/lib/api-client';
import { getToken } from '@/lib/workos/connect';
import { config } from '@worker/config';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getWorkerAccessToken() {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 30_000) {
        return cachedToken.token;
    }

    if (!config.app.workerClientId || !config.app.workerClientSecret) {
        throw new Error('WORKER_CLIENT_ID and WORKER_CLIENT_SECRET are required');
    }

    const token = await getToken({
        clientId: config.app.workerClientId,
        clientSecret: config.app.workerClientSecret,
    });

    cachedToken = {
        token: token.access_token,
        expiresAt: now + token.expires_in * 1000,
    };

    return token.access_token;
}

export async function workerRequestJson<T>(path: string, init: RequestInit = {}) {
    const token = await getWorkerAccessToken();
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token}`);
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return requestJson<T>(`${config.app.baseUrl}${path}`, {
        ...init,
        headers,
    });
}
