export function getWorkOSApiKey(): string {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error('WORKOS_API_KEY is required');
    return apiKey;
}

export function getAuthkitOrigin(): string {
    const origin = process.env.WORKOS_AUTHKIT_DOMAIN;
    if (!origin) throw new Error('WORKOS_AUTHKIT_DOMAIN is required');
    return origin.replace(/\/$/, '');
}

export async function workosRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`https://api.workos.com${path}`, {
        ...init,
        headers: {
            'Authorization': `Bearer ${getWorkOSApiKey()}`,
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`WorkOS API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
}
