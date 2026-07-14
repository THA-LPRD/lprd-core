import { Cause, Effect, Layer, Logger, LogLevel, References } from 'effect';

/** Canonical HTTP header carrying a request's correlation ID across service boundaries. */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Recognized severities, most to least severe. Matches Effect's log-level vocabulary. */
const LOG_LEVELS = ['Fatal', 'Error', 'Warn', 'Info', 'Debug', 'Trace'] as const satisfies readonly LogLevel.Severity[];

const LOG_FORMATS = ['pretty', 'json'] as const;

type LogFormat = (typeof LOG_FORMATS)[number];

/** Reads an env var, tolerating runtimes where `process` doesn't exist. */
function readEnv(name: string): string | undefined {
    if (typeof process === 'undefined') return undefined;
    return process.env?.[name];
}

/** Minimum severity that gets written out. Unrecognized/missing values fall back to Info. */
function envLogLevel(): LogLevel.LogLevel {
    const raw = readEnv('LOG_LEVEL')?.toLowerCase();
    return LOG_LEVELS.find((level) => level.toLowerCase() === raw) ?? 'Info';
}

/** Output format for the stdout logger. Unrecognized/missing values fall back to pretty. */
function envLogFormat(): LogFormat {
    const raw = readEnv('LOG_FORMAT')?.toLowerCase();
    return LOG_FORMATS.find((format) => format === raw) ?? 'pretty';
}

export type CorrelationContext = {
    requestId: string;
};

export type RequestLogContext = CorrelationContext & {
    httpMethod?: string | null;
    httpRoute?: string | null;
    rpcProcedure?: string | null;
    userId?: string | null;
};

/** Anything that can look up a header by name — a full `Headers` object is not required. */
export type HeaderReader = {
    get(name: string): string | null;
};

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export function generateRequestId(): string {
    return crypto.randomUUID();
}

/** Returns the given ID if present, otherwise generates a fresh one — propagate or originate. */
export function ensureRequestId(requestId: string | null | undefined): string {
    return requestId || generateRequestId();
}

/**
 * Establishes the correlation context at the edge of a service: reads the
 * correlation header from the incoming request, falling back to a fresh ID.
 * Header-name normalization is left to the underlying implementation.
 */
export function correlationFromHeaders(headers: HeaderReader): CorrelationContext {
    return { requestId: ensureRequestId(headers.get(REQUEST_ID_HEADER)) };
}

/** Sets the correlation header on outgoing headers so downstream calls share the request ID. */
export function applyCorrelationHeaders(headers: Headers, context: CorrelationContext): void {
    headers.set(REQUEST_ID_HEADER, context.requestId);
}

/** Strips undefined-valued entries out of an object. Explicit nulls are kept. */
export function omitUndefined<T extends Record<string, unknown>>(object: T): Partial<T> {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/** Flattens a request log context into dotted structured-log keys, dropping unknown fields. */
export function requestLogFields(context: RequestLogContext): LogFields {
    return omitUndefined({
        'request.id': context.requestId,
        'http.method': context.httpMethod ?? undefined,
        'http.route': context.httpRoute ?? undefined,
        'rpc.procedure': context.rpcProcedure ?? undefined,
        'user.id': context.userId ?? undefined,
    });
}

/** Annotates every log statement within the effect with the request's structured fields. */
export function withRequestLogContext<A, E, R>(
    effect: Effect.Effect<A, E, R>,
    context: RequestLogContext,
): Effect.Effect<A, E, R> {
    return Effect.annotateLogs(effect, requestLogFields(context));
}

/** Annotates every log statement within the effect with an arbitrary bag of fields. */
export function withLogFields<A, E, R>(effect: Effect.Effect<A, E, R>, fields: LogFields): Effect.Effect<A, E, R> {
    return Effect.annotateLogs(effect, omitUndefined(fields));
}

/** Compact single-line rendering of a failure cause for structured log fields. */
function causeLogMessage(cause: Cause.Cause<unknown>): string {
    const error = Cause.squash(cause);
    return error instanceof Error && typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : String(error);
}

/**
 * Wraps an effect in a named span and logs a single line when it ends,
 * carrying the outcome and duration. Every log emitted inside additionally
 * shows its elapsed time within the span, and a trace span of the same name is
 * opened for future trace exporters. `fields` annotate all logs within the
 * effect, the end-of-span line included; annotate mid-flight with
 * `withLogFields` (logs) or `Effect.annotateCurrentSpan` (trace).
 */
export function withLoggedSpan(name: string, fields: LogFields = {}) {
    return <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
        Effect.suspend(() => {
            const start = Date.now();
            return effect.pipe(
                Effect.onExit((exit) =>
                    withLogFields(
                        exit._tag === 'Success' ? Effect.log(`${name} completed`) : Effect.logError(`${name} failed`),
                        {
                            'span.name': name,
                            'span.duration_ms': Date.now() - start,
                            'error.message': exit._tag === 'Failure' ? causeLogMessage(exit.cause) : undefined,
                        },
                    ),
                ),
                Effect.withSpan(name),
                Effect.withLogSpan(name),
                (spanned) => withLogFields(spanned, fields),
            );
        });
}

/**
 * Stdout logger with env-driven behavior. The output format (LOG_FORMAT) is
 * decided once at construction; the minimum severity (LOG_LEVEL) is re-read on
 * every log call, so runtime changes take effect immediately.
 */
export function makeStdoutLogger(): Logger.Logger<unknown, void> {
    const write = envLogFormat() === 'json' ? Logger.consoleJson : Logger.consolePretty();
    return Logger.make((options) => {
        if (LogLevel.getOrdinal(options.logLevel) < LogLevel.getOrdinal(envLogLevel())) return;
        write.log(options);
    });
}

/**
 * Full logger layer: the env-configured stdout logger plus any additional
 * loggers. The runtime's own minimum-level pre-filter is disabled so every
 * entry reaches the loggers — otherwise a runtime LOG_LEVEL change could only
 * ever tighten, never loosen. Supplied loggers must do their own filtering.
 */
export function makeLoggerLayer(...loggers: ReadonlyArray<Logger.Logger<unknown, unknown>>) {
    return Layer.merge(
        Logger.layer([makeStdoutLogger(), ...loggers]),
        Layer.succeed(References.MinimumLogLevel, 'All'),
    );
}
