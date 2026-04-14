export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        redirect: 'manual',
        ...init,
    });

    if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        throw new Error(location ? `Unexpected redirect to ${location}` : 'Unexpected redirect response');
    }

    let body: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        body = await response.json();
    } else {
        const text = await response.text();
        body = text ? { error: text } : null;
    }

    if (!response.ok) {
        const message =
            typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
                ? body.error
                : response.statusText || 'Request failed';
        throw new Error(message);
    }

    if (contentType && !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType}`);
    }

    return body as T;
}
