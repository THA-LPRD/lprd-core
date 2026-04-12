import type { Id } from '@convex/dataModel';
import type { JobSource } from '@/lib/jobs';
import { recordAndEnqueueJob } from '@/lib/jobs/dispatch';

type EnqueueResult = {
    warning: string | null;
};

function toWarning(prefix: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `${prefix}: ${message}`;
}

export async function enqueueTemplateJobs(input: {
    token: string;
    actorId: Id<'actors'>;
    templateId: Id<'templates'>;
    siteId: Id<'sites'>;
    siteSlug: string;
    source: Extract<JobSource, 'templateSave' | 'templateCreate' | 'templateDuplicate'>;
}): Promise<EnqueueResult> {
    try {
        await recordAndEnqueueJob({
            token: input.token,
            actorId: input.actorId,
            siteId: input.siteId,
            type: 'template-thumbnail',
            resourceType: 'template',
            resourceId: input.templateId,
            source: input.source,
            payload: {
                type: 'template-thumbnail',
                payload: {
                    templateId: input.templateId,
                    siteId: input.siteId,
                    siteSlug: input.siteSlug,
                },
            },
        });
        return { warning: null };
    } catch (error) {
        return { warning: toWarning('Background template processing failed to start', error) };
    }
}

export async function enqueueFrameThumbnailJob(input: {
    token: string;
    actorId: Id<'actors'>;
    frameId: Id<'frames'>;
    siteId: Id<'sites'>;
    siteSlug: string;
}): Promise<EnqueueResult> {
    try {
        await recordAndEnqueueJob({
            token: input.token,
            actorId: input.actorId,
            siteId: input.siteId,
            type: 'frame-thumbnail',
            resourceType: 'frame',
            resourceId: input.frameId,
            source: 'frameSave',
            payload: {
                type: 'frame-thumbnail',
                payload: {
                    frameId: input.frameId,
                    siteId: input.siteId,
                    siteSlug: input.siteSlug,
                },
            },
        });
        return { warning: null };
    } catch (error) {
        return { warning: toWarning('Frame thumbnail generation failed to start', error) };
    }
}

export async function enqueueDeviceConfigureJobs(input: {
    token: string;
    actorId: Id<'actors'>;
    deviceId: Id<'devices'>;
    siteId: Id<'sites'>;
    siteSlug: string;
}): Promise<EnqueueResult> {
    try {
        await recordAndEnqueueJob({
            token: input.token,
            actorId: input.actorId,
            siteId: input.siteId,
            type: 'device-render',
            resourceType: 'device',
            resourceId: input.deviceId,
            source: 'deviceConfigure',
            payload: {
                type: 'device-render',
                payload: {
                    deviceId: input.deviceId,
                    siteId: input.siteId,
                    siteSlug: input.siteSlug,
                },
            },
        });
        return { warning: null };
    } catch (error) {
        return { warning: toWarning('Device render job failed to start', error) };
    }
}
