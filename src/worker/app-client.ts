import type { Id } from '@convex/dataModel';
import { getToken } from '@/lib/workos/connect';
import type { JobResourceType, JobSource, JobType, WorkerJobPayload } from '@/lib/jobs';
import { config } from '@worker/config';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken() {
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

async function apiRequest(path: string, init: RequestInit = {}) {
    const token = await getAccessToken();
    const response = await fetch(`${config.app.baseUrl}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
            ...(init.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Worker API ${path} failed: ${response.status} ${await response.text()}`);
    }

    return response;
}

export async function markJobStarted(jobId: Id<'jobs'>) {
    await apiRequest('/api/v2/worker/jobs/start', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
    });
}

export async function markJobSucceeded(jobId: Id<'jobs'>) {
    await apiRequest('/api/v2/worker/jobs/succeed', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
    });
}

export async function markJobFailed(jobId: Id<'jobs'>, errorMessage: string) {
    await apiRequest('/api/v2/worker/jobs/fail', {
        method: 'POST',
        body: JSON.stringify({ jobId, errorMessage }),
    });
}

export async function getUploadUrl() {
    const response = await apiRequest('/api/v2/worker/uploads', { method: 'POST', body: JSON.stringify({}) });
    return (await response.json()) as { uploadUrl: string };
}

export async function storeTemplateThumbnail(templateId: Id<'templates'>, storageId: Id<'_storage'>) {
    await apiRequest('/api/v2/worker/artifacts/template-thumbnail', {
        method: 'POST',
        body: JSON.stringify({ templateId, storageId }),
    });
}

export async function storeFrameThumbnail(frameId: Id<'frames'>, storageId: Id<'_storage'>) {
    await apiRequest('/api/v2/worker/artifacts/frame-thumbnail', {
        method: 'POST',
        body: JSON.stringify({ frameId, storageId }),
    });
}

export async function storeDeviceRender(deviceId: Id<'devices'>, storageId: Id<'_storage'>, renderedAt: number) {
    await apiRequest('/api/v2/worker/artifacts/device-render', {
        method: 'POST',
        body: JSON.stringify({ deviceId, storageId, renderedAt }),
    });
}

export async function reportHealthCheck(input: {
    applicationId: Id<'applications'>;
    status: 'healthy' | 'unhealthy' | 'error';
    responseTimeMs?: number;
    pluginVersion?: string;
    errorMessage?: string;
}) {
    await apiRequest('/api/v2/worker/health-checks/report', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function enqueueJob(input: {
    actorId?: Id<'actors'>;
    type: JobType;
    resourceType: JobResourceType;
    resourceId: string;
    siteId?: Id<'sites'>;
    source: JobSource;
    payload: WorkerJobPayload;
    dedupeKey?: string;
}) {
    await apiRequest('/api/v2/jobs', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function getDueHealthChecks() {
    const response = await apiRequest('/api/v2/worker/health-checks/due');
    return response.json() as Promise<
        Array<{
            applicationId: Id<'applications'>;
            actorId: Id<'actors'>;
            siteId: Id<'sites'> | null;
            baseUrl: string;
        }>
    >;
}

export async function getTemplateForJob(templateId: Id<'templates'>) {
    const response = await apiRequest(`/api/v2/worker/resources/template/${templateId}`);
    return response.json() as Promise<{
        _id: Id<'templates'>;
        sampleData?: unknown;
    } | null>;
}

export async function patchTemplateSampleData(templateId: Id<'templates'>, sampleData: unknown) {
    await apiRequest(`/api/v2/worker/resources/template/${templateId}/sample-data`, {
        method: 'PATCH',
        body: JSON.stringify({ sampleData }),
    });
}

export async function getPluginDataForJob(pluginDataId: Id<'pluginData'>) {
    const response = await apiRequest(`/api/v2/worker/resources/plugin-data/${pluginDataId}`);
    return response.json() as Promise<{
        _id: Id<'pluginData'>;
        data?: unknown;
    } | null>;
}

export async function patchPluginData(pluginDataId: Id<'pluginData'>, data: unknown) {
    await apiRequest(`/api/v2/worker/resources/plugin-data/${pluginDataId}/data`, {
        method: 'PATCH',
        body: JSON.stringify({ data }),
    });
}

export async function getStorageUrl(storageId: Id<'_storage'>) {
    const response = await apiRequest(`/api/v2/worker/storage-url?storageId=${storageId}`);
    const body = (await response.json()) as { url: string | null };
    return body.url;
}
