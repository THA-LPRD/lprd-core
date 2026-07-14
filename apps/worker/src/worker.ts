import { withLogFields, withLoggedSpan, withRequestLogContext } from '@workspace/observability';
import { AppClient } from '@worker/app-client';
import { WorkerConfig, type WorkerConfigShape } from '@worker/config';
import { FailureReporter } from '@worker/failure-reporter';
import { Renderer } from '@worker/renderer';
import type { WorkerJobPayload } from '@shared/jobs';
import { RENDER_TARGET_SELECTOR } from '@shared/render/constants';
import { Cause, Effect, type ManagedRuntime } from 'effect';
import { Worker } from 'bullmq';

const MAX_JOB_ERROR_MESSAGE_LENGTH = 4_000;
export type WorkerServices = WorkerConfig | AppClient | FailureReporter | Renderer;

function formatJobError(error: unknown): string {
    // Not every Error carries a string message (e.g. `new Cause.TimeoutError()` has `message: undefined`).
    const message =
        error instanceof Error && typeof error.message === 'string' && error.message.length > 0
            ? error.message
            : String(error);
    return message.length <= MAX_JOB_ERROR_MESSAGE_LENGTH
        ? message
        : `${message.slice(0, MAX_JOB_ERROR_MESSAGE_LENGTH)}... [truncated]`;
}

function getJobStatusPath(data: WorkerJobPayload): string | null {
    if (!data.jobStateId) return null;

    switch (data.type) {
        case 'template-thumbnail':
            return `/api/v2/templates/jobs/${data.jobStateId}`;
        case 'frame-thumbnail':
            return `/api/v2/frames/jobs/${data.jobStateId}`;
        case 'device-render':
            return `/api/v2/devices/jobs/${data.jobStateId}`;
        case 'health-check':
            return `/api/v2/applications/jobs/${data.jobStateId}`;
    }
}

function renderTemplateThumbnail(
    job: Extract<WorkerJobPayload, { type: 'template-thumbnail' }>,
    requestId: string,
    config: WorkerConfigShape,
) {
    return Effect.gen(function* () {
        const renderer = yield* Renderer;
        const appClient = yield* AppClient;
        const png = yield* renderer.screenshot({
            renderPath: `/site/${job.payload.siteSlug}/templates/render/${job.payload.templateId}`,
            origin: config.app.baseUrl,
            screenshotSelector: RENDER_TARGET_SELECTOR,
        });
        const formData = new FormData();
        formData.set('templateId', job.payload.templateId);
        if (job.executionId) formData.set('jobId', job.executionId);
        formData.set('file', new Blob([png], { type: 'image/png' }), 'template-thumbnail.png');
        yield* appClient.requestJson<{ ok: true }>(`/api/v2/templates/${job.payload.templateId}/thumbnail`, {
            method: 'POST',
            body: formData,
            requestId,
        });
    });
}

function renderFrameThumbnail(
    job: Extract<WorkerJobPayload, { type: 'frame-thumbnail' }>,
    requestId: string,
    config: WorkerConfigShape,
) {
    return Effect.gen(function* () {
        const renderer = yield* Renderer;
        const appClient = yield* AppClient;
        const png = yield* renderer.screenshot({
            renderPath: `/site/${job.payload.siteSlug}/frames/render/${job.payload.frameId}`,
            origin: config.app.baseUrl,
            screenshotSelector: RENDER_TARGET_SELECTOR,
        });
        const formData = new FormData();
        formData.set('frameId', job.payload.frameId);
        if (job.executionId) formData.set('jobId', job.executionId);
        formData.set('file', new Blob([png], { type: 'image/png' }), 'frame-thumbnail.png');
        yield* appClient.requestJson<{ ok: true }>(`/api/v2/frames/${job.payload.frameId}/thumbnail`, {
            method: 'POST',
            body: formData,
            requestId,
        });
    });
}

function renderDevice(
    job: Extract<WorkerJobPayload, { type: 'device-render' }>,
    requestId: string,
    config: WorkerConfigShape,
) {
    return Effect.gen(function* () {
        const renderer = yield* Renderer;
        const appClient = yield* AppClient;
        const png = yield* renderer.screenshot({
            renderPath: `/site/${job.payload.siteSlug}/devices/render/${job.payload.deviceId}`,
            origin: config.app.baseUrl,
            screenshotSelector: RENDER_TARGET_SELECTOR,
        });
        const formData = new FormData();
        formData.set('deviceId', job.payload.deviceId);
        if (job.executionId) formData.set('jobId', job.executionId);
        formData.set('renderedAt', String(Date.now()));
        formData.set('file', new Blob([png], { type: 'image/png' }), 'device-render.png');
        yield* appClient.requestJson<{ ok: true }>(`/api/v2/devices/${job.payload.deviceId}/render`, {
            method: 'POST',
            body: formData,
            requestId,
        });
    });
}

function runHealthCheck(
    job: Extract<WorkerJobPayload, { type: 'health-check' }>,
    requestId: string,
    config: WorkerConfigShape,
) {
    return Effect.gen(function* () {
        const appClient = yield* AppClient;
        const start = Date.now();
        const endpoint = `/api/v2/applications/${job.payload.applicationId}/health-check`;

        const report = (body: Record<string, unknown>) =>
            appClient.requestJson<{ ok: true }>(endpoint, {
                method: 'POST',
                body: JSON.stringify(body),
                requestId,
            });

        const healthRequest = Effect.tryPromise((signal) => fetch(`${job.payload.baseUrl}/health`, { signal })).pipe(
            Effect.timeoutOrElse({
                duration: config.healthCheck.timeoutMs,
                orElse: () =>
                    Effect.fail(
                        new Cause.TimeoutError(`Health check timed out after ${config.healthCheck.timeoutMs}ms`),
                    ),
            }),
            withLoggedSpan('health.probe', { 'health.base_url': job.payload.baseUrl }),
        );

        const outcome = yield* Effect.matchEffect(healthRequest, {
            onFailure: (error) =>
                report({
                    jobId: job.executionId,
                    status: 'error',
                    responseTimeMs: Date.now() - start,
                    errorMessage: formatJobError(error),
                }),
            onSuccess: (response) =>
                Effect.gen(function* () {
                    const responseTimeMs = Date.now() - start;
                    if (!response.ok) {
                        return yield* report({
                            jobId: job.executionId,
                            status: 'unhealthy',
                            responseTimeMs,
                            errorMessage: `HTTP ${response.status} ${response.statusText}`,
                        });
                    }

                    // Parse failures are part of the health probe: report them as status 'error'
                    // instead of letting them escape into the job-state /fail path.
                    return yield* Effect.matchEffect(
                        Effect.tryPromise(() => response.json() as Promise<{ status?: string; version?: string }>),
                        {
                            onFailure: (error) =>
                                report({
                                    jobId: job.executionId,
                                    status: 'error',
                                    responseTimeMs,
                                    errorMessage: formatJobError(error),
                                }),
                            onSuccess: (body) => {
                                const isHealthy = body.status === 'healthy';
                                return report({
                                    jobId: job.executionId,
                                    status: isHealthy ? 'healthy' : 'unhealthy',
                                    responseTimeMs,
                                    pluginVersion: body.version,
                                    errorMessage: isHealthy ? undefined : `Plugin reported status: ${body.status}`,
                                });
                            },
                        },
                    );
                }),
        });

        return outcome;
    });
}

export function handleJob(data: WorkerJobPayload, fallbackJobId: string, config: WorkerConfigShape) {
    const requestId = data.executionId ?? fallbackJobId;
    const jobStatusPath = getJobStatusPath(data);
    const run = Effect.gen(function* () {
        const appClient = yield* AppClient;
        if (jobStatusPath) {
            yield* appClient.requestJson<{ ok: true }>(`${jobStatusPath}/start`, { method: 'POST', requestId });
        }

        switch (data.type) {
            case 'template-thumbnail':
                return yield* renderTemplateThumbnail(data, requestId, config);
            case 'frame-thumbnail':
                return yield* renderFrameThumbnail(data, requestId, config);
            case 'device-render':
                return yield* renderDevice(data, requestId, config);
            case 'health-check':
                return yield* runHealthCheck(data, requestId, config);
        }
    }).pipe(
        Effect.timeoutOrElse({
            duration: config.jobs.timeoutMs,
            orElse: () => Effect.fail(new Cause.TimeoutError(`Job timed out after ${config.jobs.timeoutMs}ms`)),
        }),
    );

    // All job types report /fail on pipeline errors — for health-check this covers failures of the
    // health-report POST itself, which would otherwise strand the jobState in `running`.
    const reportFailure = jobStatusPath
        ? Effect.tapError(run, (error) =>
              Effect.gen(function* () {
                  const failureReporter = yield* FailureReporter;
                  yield* failureReporter.enqueue({
                      jobStatusPath,
                      errorMessage: formatJobError(error),
                      requestId,
                  });
              }),
          )
        : run;

    return withLogFields(withRequestLogContext(withLoggedSpan('job')(reportFailure), { requestId }), {
        'job.type': data.type,
    });
}

export function startWorker(
    runtime: ManagedRuntime.ManagedRuntime<WorkerServices, unknown>,
    config: WorkerConfigShape,
) {
    const worker = new Worker<WorkerJobPayload>(
        config.jobs.queueName,
        (job) => runtime.runPromise(handleJob(job.data, job.id ?? 'unknown', config)),
        {
            connection: config.redis,
            concurrency: 8,
            stalledInterval: 30_000,
            maxStalledCount: 1,
        },
    );

    // No 'failed' listener: the job span's end log already reports failures with full context.
    worker.on('stalled', (jobId) => {
        void runtime
            .runPromise(withLogFields(Effect.logError(`Job ${jobId} stalled`), { 'job.id': jobId }))
            .catch(() => undefined);
    });

    return worker;
}
