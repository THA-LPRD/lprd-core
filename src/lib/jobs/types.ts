import type { Id } from '@convex/dataModel';

export type JobStatus = 'pending' | 'paused' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type JobType = 'normalize-images' | 'template-thumbnail' | 'frame-thumbnail' | 'device-render' | 'health-check';

export type JobResourceType = 'pluginData' | 'template' | 'frame' | 'device' | 'application';

export type JobSource =
    | 'pluginPush'
    | 'manualSave'
    | 'templateSave'
    | 'templateCreate'
    | 'templateDuplicate'
    | 'frameSave'
    | 'deviceConfigure'
    | 'pluginTemplateUpsert'
    | 'scheduler';

export type NormalizeImagesPayload = {
    resourceType: 'pluginData' | 'template';
    resourceId: string;
    actorId: Id<'actors'>;
    siteId?: Id<'sites'>;
    source: JobSource;
    nextJobs: Array<RenderOrThumbnailPayload>;
};

export type TemplateThumbnailPayload = {
    templateId: Id<'templates'>;
    siteId?: Id<'sites'>;
    siteSlug: string;
};

export type FrameThumbnailPayload = {
    frameId: Id<'frames'>;
    siteId: Id<'sites'>;
    siteSlug: string;
};

export type DeviceRenderPayload = {
    deviceId: Id<'devices'>;
    siteId: Id<'sites'>;
    siteSlug: string;
};

export type HealthCheckPayload = {
    applicationId: Id<'applications'>;
    actorId: Id<'actors'>;
    siteId: Id<'sites'> | null;
    baseUrl: string;
};

export type RenderOrThumbnailPayload =
    | { type: 'template-thumbnail'; payload: TemplateThumbnailPayload }
    | { type: 'frame-thumbnail'; payload: FrameThumbnailPayload }
    | { type: 'device-render'; payload: DeviceRenderPayload };

export type WorkerJobPayload =
    | {
          jobStateId?: Id<'jobStates'>;
          executionId?: Id<'jobLogs'>;
          type: 'normalize-images';
          payload: NormalizeImagesPayload;
      }
    | {
          jobStateId?: Id<'jobStates'>;
          executionId?: Id<'jobLogs'>;
          type: 'template-thumbnail';
          payload: TemplateThumbnailPayload;
      }
    | {
          jobStateId?: Id<'jobStates'>;
          executionId?: Id<'jobLogs'>;
          type: 'frame-thumbnail';
          payload: FrameThumbnailPayload;
      }
    | {
          jobStateId?: Id<'jobStates'>;
          executionId?: Id<'jobLogs'>;
          type: 'device-render';
          payload: DeviceRenderPayload;
      }
    | {
          jobStateId?: Id<'jobStates'>;
          executionId?: Id<'jobLogs'>;
          type: 'health-check';
          payload: HealthCheckPayload;
      };

export function makeWorkKey(type: JobType, resourceId: string) {
    return `${type}__${resourceId}`;
}
