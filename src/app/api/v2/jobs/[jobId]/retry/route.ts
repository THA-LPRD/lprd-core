import { handleJobActionError, retryJob } from '@/lib/job-controls';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
    try {
        const { jobId } = await context.params;
        return await retryJob(jobId);
    } catch (error) {
        return handleJobActionError(error);
    }
}
