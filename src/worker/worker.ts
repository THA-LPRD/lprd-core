import { Worker } from 'bullmq';
import type { Id } from '@convex/dataModel';
import { recordAndEnqueueJob } from '@/lib/jobs/dispatch';
import type { WorkerJobPayload } from '@/lib/jobs';
import { getWorkerAccessToken, workerRequestJson } from '@worker/app-client';
import { config } from '@worker/config';
import { extractImageUrls } from '@/lib/template-data';
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

async function normalizePluginDataImages(job: Extract<WorkerJobPayload, { type: 'normalize-images' }>) {
    if (job.payload.resourceType === 'template') {
        const template = await workerRequestJson<{
            _id: Id<'templates'>;
            sampleData?: unknown;
        } | null>(`/api/v2/templates/${job.payload.resourceId as Id<'templates'>}/sample-data`);
        if (!template) throw new Error('Template not found');
        const normalized = await normalizeData(template.sampleData);
        const formData = new FormData();
        formData.set('sampleData', JSON.stringify(template.sampleData ?? null));
        if (job.executionId) {
            formData.set('jobId', job.executionId);
        }
        for (const image of normalized.uploadedImages) {
            formData.append('uploadUrl', image.externalUrl);
            formData.append('file', image.blob, 'normalized-image');
        }
        await workerRequestJson<{ ok: true }>(`/api/v2/templates/${template._id}/sample-data`, {
            method: 'PATCH',
            body: formData,
        });
    } else {
        const record = await workerRequestJson<{
            _id: Id<'pluginData'>;
            data?: unknown;
        } | null>(`/api/v2/plugin-data/${job.payload.resourceId as Id<'pluginData'>}/data`);
        if (!record) throw new Error('Plugin data not found');
        const normalized = await normalizeData(record.data);
        const formData = new FormData();
        formData.set('data', JSON.stringify(record.data ?? null));
        if (job.executionId) {
            formData.set('jobId', job.executionId);
        }
        for (const image of normalized.uploadedImages) {
            formData.append('uploadUrl', image.externalUrl);
            formData.append('file', image.blob, 'normalized-image');
        }
        await workerRequestJson<{ ok: true }>(`/api/v2/plugin-data/${record._id}/data`, {
            method: 'PATCH',
            body: formData,
        });
    }

    for (const nextJob of job.payload.nextJobs) {
        await recordAndEnqueueJob({
            token: await getWorkerAccessToken(),
            actorId: job.payload.actorId,
            type: nextJob.type,
            resourceType:
                nextJob.type === 'device-render' ? 'device' : nextJob.type === 'frame-thumbnail' ? 'frame' : 'template',
            resourceId:
                nextJob.type === 'device-render'
                    ? nextJob.payload.deviceId
                    : nextJob.type === 'frame-thumbnail'
                      ? nextJob.payload.frameId
                      : nextJob.payload.templateId,
            siteId: nextJob.payload.siteId,
            source: job.payload.source,
            payload: nextJob,
        });
    }
}

async function normalizeData(data: unknown) {
    const urls = extractImageUrls(data);
    if (urls.length === 0) {
        return { uploadedImages: [] as { externalUrl: string; blob: Blob }[] };
    }

    const failures: string[] = [];
    const uploadedImages: { externalUrl: string; blob: Blob }[] = [];
    for (const externalUrl of urls) {
        try {
            const response = await fetch(externalUrl);
            if (!response.ok) {
                failures.push(`${externalUrl}: HTTP ${response.status}`);
                continue;
            }

            const blob = await response.blob();
            uploadedImages.push({ externalUrl, blob });
        } catch (error) {
            failures.push(`${externalUrl}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    if (failures.length > 0 && uploadedImages.length === 0) {
        throw new Error(`All image downloads failed:\n${failures.join('\n')}`);
    }

    if (failures.length > 0) {
        console.warn(`[worker] Some image downloads failed:\n${failures.join('\n')}`);
    }

    return { uploadedImages };
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
        case 'normalize-images':
            return data.payload.resourceType === 'template'
                ? `/api/v2/templates/jobs/${jobId}`
                : `/api/v2/plugin-data/jobs/${jobId}`;
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
                        case 'normalize-images':
                            return normalizePluginDataImages(job.data);
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
