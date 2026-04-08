import type { Id } from '@convex/dataModel';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import { containsImgFuncs } from '@/lib/template-data';
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
    sampleData: unknown;
    source: Extract<JobSource, 'templateSave' | 'templateCreate' | 'templateDuplicate'>;
}): Promise<EnqueueResult> {
    const nextJob = {
        type: 'template-thumbnail' as const,
        payload: {
            templateId: input.templateId,
            siteId: input.siteId,
            siteSlug: input.siteSlug,
        },
    };

    try {
        await recordAndEnqueueJob({
            token: input.token,
            actorId: input.actorId,
            siteId: input.siteId,
            type: containsImgFuncs(input.sampleData) ? 'normalize-images' : 'template-thumbnail',
            resourceType: 'template',
            resourceId: input.templateId,
            source: input.source,
            payload: containsImgFuncs(input.sampleData)
                ? {
                      type: 'normalize-images',
                      payload: {
                          resourceType: 'template',
                          resourceId: input.templateId,
                          actorId: input.actorId,
                          siteId: input.siteId,
                          source: input.source,
                          nextJobs: [nextJob],
                      },
                  }
                : nextJob,
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
    normalizationRecordIds: Id<'pluginData'>[];
}): Promise<EnqueueResult> {
    const nextJob = {
        type: 'device-render' as const,
        payload: {
            deviceId: input.deviceId,
            siteId: input.siteId,
            siteSlug: input.siteSlug,
        },
    };

    if (input.normalizationRecordIds.length === 0) {
        try {
            await recordAndEnqueueJob({
                token: input.token,
                actorId: input.actorId,
                siteId: input.siteId,
                type: 'device-render',
                resourceType: 'device',
                resourceId: input.deviceId,
                source: 'deviceConfigure',
                payload: nextJob,
            });
            return { warning: null };
        } catch (error) {
            return { warning: toWarning('Device render job failed to start', error) };
        }
    }

    const warnings: string[] = [];
    for (const pluginDataId of input.normalizationRecordIds) {
        try {
            await recordAndEnqueueJob({
                token: input.token,
                actorId: input.actorId,
                siteId: input.siteId,
                type: 'normalize-images',
                resourceType: 'pluginData',
                resourceId: pluginDataId,
                source: 'deviceConfigure',
                dedupeKey: `normalize-images__${pluginDataId}`,
                payload: {
                    type: 'normalize-images',
                    payload: {
                        resourceType: 'pluginData',
                        resourceId: pluginDataId,
                        actorId: input.actorId,
                        siteId: input.siteId,
                        source: 'deviceConfigure',
                        nextJobs: [nextJob],
                    },
                },
            });
        } catch (error) {
            warnings.push(toWarning(`Normalization job for ${pluginDataId} failed to start`, error));
        }
    }

    return {
        warning: warnings.length > 0 ? warnings.join('\n') : null,
    };
}

export async function getTemplateSampleDataForDuplicate(input: { token: string; templateId: Id<'templates'> }) {
    const template = await fetchQuery(api.templates.crud.getById, { id: input.templateId }, { token: input.token });
    return template?.sampleData;
}
