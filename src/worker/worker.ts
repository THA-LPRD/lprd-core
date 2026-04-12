import { Worker } from 'bullmq';
import type { WorkerJobPayload } from '@/lib/jobs';
import { workerRequestJson } from '@worker/app-client';
import { config } from '@worker/config';
import { generateScreenshot } from '@/lib/render/thumbnail';
import { RENDER_TARGET_SELECTOR } from '@/lib/render/constants';

async function withTimeout<T>(run: () => Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Job timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
        return await Promise.race([run(), timeoutPromise]);
    } finally {
        clearTimeout(timeoutHandle!);
    }
}

async function renderTemplateThumbnail(job: Extract<WorkerJobPayload, { type: 'template-thumbnail' }>) {
    const payload = job.payload;
    const png = await generateScreenshot({
        renderPath: `/site/${payload.siteSlug}/templates/render/${payload.templateId}`,
        origin: config.app.baseUrl,
        screenshotSelector: RENDER_TARGET_SELECTOR,
    });
    const formData = new FormData();
    formData.set('templateId', payload.templateId);
    if (job.executionId) {
        formData.set('jobId', job.executionId);
    }
    formData.set('file', new Blob([png], { type: 'image/png' }), 'template-thumbnail.png');
    await workerRequestJson<{ ok: true }>(`/api/v2/templates/${payload.templateId}/thumbnail`, {
        method: 'POST',
        body: formData,
    });
}

async function renderFrameThumbnail(job: Extract<WorkerJobPayload, { type: 'frame-thumbnail' }>) {
    const payload = job.payload;
    const png = await generateScreenshot({
        renderPath: `/site/${payload.siteSlug}/frames/render/${payload.frameId}`,
        origin: config.app.baseUrl,
        screenshotSelector: RENDER_TARGET_SELECTOR,
    });
    const formData = new FormData();
    formData.set('frameId', payload.frameId);
    if (job.executionId) {
        formData.set('jobId', job.executionId);
    }
    formData.set('file', new Blob([png], { type: 'image/png' }), 'frame-thumbnail.png');
    await workerRequestJson<{ ok: true }>(`/api/v2/frames/${payload.frameId}/thumbnail`, {
        method: 'POST',
        body: formData,
    });
}

async function renderDevice(job: Extract<WorkerJobPayload, { type: 'device-render' }>) {
    const payload = job.payload;
    const png = await generateScreenshot({
        renderPath: `/site/${payload.siteSlug}/devices/render/${payload.deviceId}`,
        origin: config.app.baseUrl,
        screenshotSelector: RENDER_TARGET_SELECTOR,
    });
    const formData = new FormData();
    formData.set('deviceId', payload.deviceId);
    if (job.executionId) {
        formData.set('jobId', job.executionId);
    }
    formData.set('renderedAt', String(Date.now()));
    formData.set('file', new Blob([png], { type: 'image/png' }), 'device-render.png');
    await workerRequestJson<{ ok: true }>(`/api/v2/devices/${payload.deviceId}/render`, {
        method: 'POST',
        body: formData,
    });
}

async function runHealthCheck(job: Extract<WorkerJobPayload, { type: 'health-check' }>) {
    const payload = job.payload;
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.healthCheck.timeoutMs);
        const res = await fetch(`${payload.baseUrl}/health`, { signal: controller.signal });
        clearTimeout(timeout);

        const responseTimeMs = Date.now() - start;
        if (res.ok) {
            const body = (await res.json()) as { status?: string; version?: string };
            const isHealthy = body.status === 'healthy';
            await workerRequestJson<{ ok: true }>(`/api/v2/applications/${payload.applicationId}/health-check`, {
                method: 'POST',
                body: JSON.stringify({
                    jobId: job.executionId,
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    responseTimeMs,
                    pluginVersion: body.version,
                    errorMessage: isHealthy ? undefined : `Plugin reported status: ${body.status}`,
                }),
            });
            return;
        }

        await workerRequestJson<{ ok: true }>(`/api/v2/applications/${payload.applicationId}/health-check`, {
            method: 'POST',
            body: JSON.stringify({
                jobId: job.executionId,
                status: 'unhealthy',
                responseTimeMs,
                errorMessage: `HTTP ${res.status} ${res.statusText}`,
            }),
        });
    } catch (error) {
        await workerRequestJson<{ ok: true }>(`/api/v2/applications/${payload.applicationId}/health-check`, {
            method: 'POST',
            body: JSON.stringify({
                jobId: job.executionId,
                status: 'error',
                responseTimeMs: Date.now() - start,
                errorMessage: error instanceof Error ? error.message : String(error),
            }),
        });
    }
}

function getJobStatusPath(data: WorkerJobPayload): string | null {
    if (!data.jobStateId) return null;
    const jobId = data.jobStateId;
    switch (data.type) {
        case 'template-thumbnail':
            return `/api/v2/templates/jobs/${jobId}`;
        case 'frame-thumbnail':
            return `/api/v2/frames/jobs/${jobId}`;
        case 'device-render':
            return `/api/v2/devices/jobs/${jobId}`;
        case 'health-check':
            return `/api/v2/applications/jobs/${jobId}`;
    }
}

export function startWorker() {
    const worker = new Worker<WorkerJobPayload>(
        config.jobs.queueName,
        async (job) => {
            const jobStatusPath = getJobStatusPath(job.data);
            if (jobStatusPath) {
                await workerRequestJson<{ ok: true }>(`${jobStatusPath}/start`, { method: 'POST' });
            }

            try {
                await withTimeout(() => {
                    switch (job.data.type) {
                        case 'template-thumbnail':
                            return renderTemplateThumbnail(job.data);
                        case 'frame-thumbnail':
                            return renderFrameThumbnail(job.data);
                        case 'device-render':
                            return renderDevice(job.data);
                        case 'health-check':
                            return runHealthCheck(job.data);
                    }
                }, config.jobs.timeoutMs);
            } catch (error) {
                if (jobStatusPath) {
                    await workerRequestJson<{ ok: true }>(`${jobStatusPath}/fail`, {
                        method: 'POST',
                        body: JSON.stringify({
                            errorMessage: error instanceof Error ? error.message : String(error),
                        }),
                    });
                }
                throw error;
            }
        },
        {
            connection: config.redis,
            concurrency: 8,
            stalledInterval: 30_000,
            maxStalledCount: 1,
        },
    );

    worker.on('failed', (job, err) => {
        console.error(`[worker] Job ${job?.id ?? 'unknown'} failed:`, err.message);
    });

    worker.on('stalled', async (jobId) => {
        console.error(`[worker] Job ${jobId} stalled`);
    });

    return worker;
}
