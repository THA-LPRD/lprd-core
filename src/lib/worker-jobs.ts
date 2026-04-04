import { fetchMutation } from 'convex/nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import type { JobResourceType, JobSource, JobType, WorkerJobPayload } from '@/lib/jobs';
import { makeJobKey } from '@/lib/jobs';
import { enqueueWorkerJob } from '@worker/queue';

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

    const jobId = await fetchMutation(
        api.jobs.create,
        {
            actorId: input.actorId,
            siteId: input.siteId,
            type: input.type,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            source: input.source,
            dedupeKey,
            payload: input.payload.payload,
        },
        { token: input.token },
    );

    await enqueueWorkerJob({ ...input.payload, jobId }, dedupeKey);
    return jobId;
}
