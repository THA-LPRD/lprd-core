import { Worker } from 'bullmq';
import type { Id } from '@convex/dataModel';
import { config } from '@worker/config';
import {
    enqueueJob,
    getPluginDataForJob,
    getStorageUrl,
    getTemplateForJob,
    getUploadUrl,
    markJobFailed,
    markJobStarted,
    markJobSucceeded,
    patchPluginData,
    patchTemplateSampleData,
    reportHealthCheck,
    storeDeviceRender,
    storeFrameThumbnail,
    storeTemplateThumbnail,
} from '@worker/app-client';
import type { WorkerJobPayload } from '@/lib/jobs';
import { extractImageUrls, replaceImgUrls } from '@/lib/template-data';
import { generateScreenshot } from '@/lib/render/thumbnail';

async function uploadBlob(blob: Blob): Promise<Id<'_storage'>> {
    const { uploadUrl } = await getUploadUrl();
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as { storageId: Id<'_storage'> };
    return body.storageId;
}

async function uploadPng(png: ArrayBuffer): Promise<Id<'_storage'>> {
    return uploadBlob(new Blob([png], { type: 'image/png' }));
}

async function normalizePluginDataImages(job: Extract<WorkerJobPayload, { type: 'normalize-images' }>) {
    if (job.payload.resourceType === 'template') {
        const template = await getTemplateForJob(job.payload.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');
        const normalized = await normalizeData(template.sampleData);
        await patchTemplateSampleData(template._id, normalized);
    } else {
        const record = await getPluginDataForJob(job.payload.resourceId as Id<'pluginData'>);
        if (!record) throw new Error('Plugin data not found');
        const normalized = await normalizeData(record.data);
        await patchPluginData(record._id, normalized);
    }

    for (const nextJob of job.payload.nextJobs) {
        await enqueueJob({
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
    if (urls.length === 0) return data;

    const failures: string[] = [];
    const replacements = new Map<string, { url: string; storageId: string }>();
    for (const externalUrl of urls) {
        try {
            const response = await fetch(externalUrl);
            if (!response.ok) {
                failures.push(`${externalUrl}: HTTP ${response.status}`);
                continue;
            }

            const blob = await response.blob();
            const storageId = await uploadBlob(blob);
            const servingUrl = await getStorageUrl(storageId);
            if (!servingUrl) {
                failures.push(`${externalUrl}: failed to get serving URL`);
                continue;
            }
            replacements.set(externalUrl, { url: servingUrl, storageId });
        } catch (error) {
            failures.push(`${externalUrl}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    if (failures.length > 0 && replacements.size === 0) {
        throw new Error(`All image downloads failed:\n${failures.join('\n')}`);
    }

    if (failures.length > 0) {
        console.warn(`[worker] Some image downloads failed:\n${failures.join('\n')}`);
    }

    return replaceImgUrls(data, replacements);
}

async function renderTemplateThumbnail(payload: Extract<WorkerJobPayload, { type: 'template-thumbnail' }>['payload']) {
    const png = await generateScreenshot({
        renderPath: `/site/${payload.siteSlug}/templates/render/${payload.templateId}`,
        width: 800,
        height: 480,
        origin: config.app.baseUrl,
    });
    const storageId = await uploadPng(png);
    await storeTemplateThumbnail(payload.templateId, storageId);
}

async function renderFrameThumbnail(payload: Extract<WorkerJobPayload, { type: 'frame-thumbnail' }>['payload']) {
    const png = await generateScreenshot({
        renderPath: `/site/${payload.siteSlug}/frames/render/${payload.frameId}`,
        width: 800,
        height: 480,
        origin: config.app.baseUrl,
    });
    const storageId = await uploadPng(png);
    await storeFrameThumbnail(payload.frameId, storageId);
}

async function renderDevice(payload: Extract<WorkerJobPayload, { type: 'device-render' }>['payload']) {
    const png = await generateScreenshot({
        renderPath: `/site/${payload.siteSlug}/devices/render/${payload.deviceId}`,
        width: 800,
        height: 480,
        origin: config.app.baseUrl,
    });
    const storageId = await uploadPng(png);
    await storeDeviceRender(payload.deviceId, storageId, Date.now());
}

async function runHealthCheck(payload: Extract<WorkerJobPayload, { type: 'health-check' }>['payload']) {
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
            await reportHealthCheck({
                applicationId: payload.applicationId,
                status: isHealthy ? 'healthy' : 'unhealthy',
                responseTimeMs,
                pluginVersion: body.version,
                errorMessage: isHealthy ? undefined : `Plugin reported status: ${body.status}`,
            });
            return;
        }

        await reportHealthCheck({
            applicationId: payload.applicationId,
            status: 'unhealthy',
            responseTimeMs,
            errorMessage: `HTTP ${res.status} ${res.statusText}`,
        });
    } catch (error) {
        await reportHealthCheck({
            applicationId: payload.applicationId,
            status: 'error',
            responseTimeMs: Date.now() - start,
            errorMessage: error instanceof Error ? error.message : String(error),
        });
    }
}

export function startWorker() {
    const worker = new Worker<WorkerJobPayload>(
        config.jobs.queueName,
        async (job) => {
            if (job.data.jobId) {
                await markJobStarted(job.data.jobId);
            }

            try {
                switch (job.data.type) {
                    case 'normalize-images':
                        await normalizePluginDataImages(job.data);
                        break;
                    case 'template-thumbnail':
                        await renderTemplateThumbnail(job.data.payload);
                        break;
                    case 'frame-thumbnail':
                        await renderFrameThumbnail(job.data.payload);
                        break;
                    case 'device-render':
                        await renderDevice(job.data.payload);
                        break;
                    case 'health-check':
                        await runHealthCheck(job.data.payload);
                        break;
                }

                if (job.data.jobId) {
                    await markJobSucceeded(job.data.jobId);
                }
            } catch (error) {
                if (job.data.jobId) {
                    await markJobFailed(job.data.jobId, error instanceof Error ? error.message : String(error));
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
