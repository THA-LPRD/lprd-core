import { fetchMutation } from 'convex/nextjs';
import { Queue } from 'bullmq';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { config } from '@worker/config';
import { type JobResourceType, type JobSource, type JobType, makeJobKey, type WorkerJobPayload } from '@/lib/jobs';

export const appJobsQueue = new Queue<WorkerJobPayload>(config.jobs.queueName, {
    connection: config.redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export async function enqueueWorkerJob(job: WorkerJobPayload, jobId: string) {
    await appJobsQueue.add(job.type as WorkerJobPayload['type'], job, {
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
    });
}

export async function recordAndEnqueueJob(input: {
    token: string;
    actorId: Id<'actors'>;
    siteId?: Id<'sites'>;
    type: JobType;
    resourceType: JobResourceType;
    resourceId: string;
    source: JobSource;
    payload: WorkerJobPayload;
    dedupeKey?: string;
}) {
    const dedupeKey = input.dedupeKey ?? makeJobKey(input.type, input.resourceId);

    const jobId =
        input.resourceType === 'template'
            ? await fetchMutation(
                  api.jobs.templateJobs.createResourceJob,
                  {
                      actorId: input.actorId,
                      siteId: input.siteId,
                      type: input.type as 'normalize-images' | 'template-thumbnail',
                      templateId: input.resourceId as Id<'templates'>,
                      source: input.source,
                      dedupeKey,
                      payload: input.payload.payload,
                  },
                  { token: input.token },
              )
            : input.resourceType === 'frame'
              ? await fetchMutation(
                    api.jobs.frameJobs.createResourceJob,
                    {
                        actorId: input.actorId,
                        siteId: input.siteId,
                        frameId: input.resourceId as Id<'frames'>,
                        source: input.source,
                        dedupeKey,
                        payload: input.payload.payload,
                    },
                    { token: input.token },
                )
              : input.resourceType === 'device'
                ? await fetchMutation(
                      api.jobs.deviceJobs.createResourceJob,
                      {
                          actorId: input.actorId,
                          siteId: input.siteId,
                          deviceId: input.resourceId as Id<'devices'>,
                          source: input.source,
                          dedupeKey,
                          payload: input.payload.payload,
                      },
                      { token: input.token },
                  )
                : input.resourceType === 'pluginData'
                  ? await fetchMutation(
                        api.jobs.pluginDataJobs.createResourceJob,
                        {
                            actorId: input.actorId,
                            siteId: input.siteId,
                            pluginDataId: input.resourceId as Id<'pluginData'>,
                            source: input.source,
                            dedupeKey,
                            payload: input.payload.payload,
                        },
                        { token: input.token },
                    )
                  : await fetchMutation(
                        api.jobs.applicationJobs.createResourceJob,
                        {
                            actorId: input.actorId,
                            siteId: input.siteId,
                            applicationId: input.resourceId as Id<'applications'>,
                            source: input.source,
                            dedupeKey,
                            payload: input.payload.payload,
                        },
                        { token: input.token },
                    );

    await enqueueWorkerJob({ ...input.payload, jobId }, dedupeKey);
    return jobId;
}
