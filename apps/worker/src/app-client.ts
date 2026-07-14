import { applyCorrelationHeaders, withLoggedSpan } from '@workspace/observability';
import { getToken } from '@shared/workos/connect';
import { AppClientConfig, WorkerConfig } from '@worker/config';
import { Context, Data, Effect, Layer, Schedule } from 'effect';

const APP_REQUEST_TIMEOUT_MS = 15_000;

type Token = {
    readonly token: string;
    readonly expiresAt: number;
};

export type RequestOptions = RequestInit & {
    readonly requestId: string;
    /**
     * Opt-in transient-failure retries. Defaults to 'none': most calls are non-idempotent POSTs
     * (/start, uploads, health reports) where a committed-but-lost response must not be resubmitted.
     */
    readonly retry?: 'transient' | 'none';
};

export class AppRequestError extends Data.TaggedError('AppRequestError')<{
    readonly message: string;
    readonly transient: boolean;
    readonly status?: number;
}> {}

export class AppClient extends Context.Service<
    AppClient,
    {
        readonly requestJson: <T>(path: string, options: RequestOptions) => Effect.Effect<T, AppRequestError>;
        readonly getAccessToken: Effect.Effect<string, AppRequestError>;
    }
>()('AppClient') {}

const defaultRetrySchedule = Schedule.exponential(500).pipe(Schedule.take(2));

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function readResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return response.json();
    }

    const text = await response.text();
    return text ? { error: text } : null;
}

function responseErrorMessage(body: unknown, response: Response): string {
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
        return body.error;
    }

    return response.statusText || 'Request failed';
}

function requestJson<T>(
    config: AppClientConfig,
    path: string,
    options: RequestOptions,
): Effect.Effect<T, AppRequestError> {
    const request = Effect.tryPromise({
        try: async (signal) => {
            const headers = new Headers(options.headers);
            headers.set('authorization', `Bearer ${config.accessToken}`);
            applyCorrelationHeaders(headers, { requestId: options.requestId });
            if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }

            let response: Response;
            try {
                response = await fetch(`${config.baseUrl}${path}`, {
                    ...options,
                    headers,
                    redirect: 'manual',
                    signal: options.signal ?? signal,
                });
            } catch (error) {
                throw new AppRequestError({ message: errorMessage(error), transient: true });
            }

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                throw new AppRequestError({
                    message: location ? `Unexpected redirect to ${location}` : 'Unexpected redirect response',
                    transient: false,
                    status: response.status,
                });
            }

            let body: unknown;
            try {
                body = await readResponseBody(response);
            } catch (error) {
                throw new AppRequestError({
                    message: errorMessage(error),
                    transient: false,
                    status: response.status,
                });
            }

            if (!response.ok) {
                throw new AppRequestError({
                    message: `HTTP ${response.status}: ${responseErrorMessage(body, response)}`,
                    transient: response.status >= 500,
                    status: response.status,
                });
            }

            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/json')) {
                throw new AppRequestError({
                    message: `Expected JSON response, got ${contentType}`,
                    transient: false,
                    status: response.status,
                });
            }

            return body as T;
        },
        catch: (error) =>
            error instanceof AppRequestError
                ? error
                : new AppRequestError({ message: errorMessage(error), transient: true }),
    }).pipe(
        Effect.timeout(APP_REQUEST_TIMEOUT_MS),
        Effect.mapError((error) =>
            error instanceof AppRequestError
                ? error
                : new AppRequestError({ message: 'App request timed out', transient: true }),
        ),
    );

    return options.retry === 'transient'
        ? request.pipe(Effect.retry({ schedule: defaultRetrySchedule, while: (error) => error.transient }))
        : request;
}

export const AppClientLive = Layer.effect(
    AppClient,
    Effect.gen(function* () {
        const workerConfig = yield* WorkerConfig;
        let cachedToken: Token | null = null;

        const getAccessToken = Effect.suspend(() => {
            const now = Date.now();
            if (cachedToken && cachedToken.expiresAt > now + 30_000) {
                return Effect.succeed(cachedToken.token);
            }

            return Effect.tryPromise({
                try: () =>
                    getToken({
                        clientId: workerConfig.app.workerClientId,
                        clientSecret: workerConfig.app.workerClientSecret,
                    }),
                catch: (error) =>
                    new AppRequestError({
                        message: `Failed to fetch access token: ${errorMessage(error)}`,
                        transient: true,
                    }),
            }).pipe(
                Effect.map((token) => {
                    cachedToken = {
                        token: token.access_token,
                        expiresAt: now + token.expires_in * 1_000,
                    };
                    return token.access_token;
                }),
                withLoggedSpan('app.token-refresh'),
            );
        });

        return {
            getAccessToken,
            requestJson: <T>(path: string, options: RequestOptions) =>
                getAccessToken.pipe(
                    Effect.flatMap((accessToken) =>
                        requestJson<T>({ baseUrl: workerConfig.app.baseUrl, accessToken }, path, options),
                    ),
                    withLoggedSpan('app.request', {
                        'http.path': path,
                        'http.method': options.method ?? 'GET',
                        'request.id': options.requestId,
                    }),
                ),
        };
    }),
);
