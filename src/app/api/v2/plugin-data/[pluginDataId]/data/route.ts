import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization, requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { uploadImagesAndReplaceUrls } from '@/lib/server/imageUpload';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ pluginDataId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const token = authorization.accessToken;
        const { pluginDataId } = await context.params;
        const record = await fetchQuery(
            api.applications.plugin.data.getByIdForJob,
            { id: pluginDataId as Id<'pluginData'> },
            { token },
        );
        if (!record) return NextResponse.json({ error: 'Plugin data not found' }, { status: 404 });
        await requirePermission(permissionCatalog.org.site.pluginData.view, { request, siteId: record.siteId });
        return NextResponse.json(record);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ pluginDataId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const token = authorization.accessToken;
        const { pluginDataId } = await context.params;
        const pluginDataIdValue = pluginDataId as Id<'pluginData'>;
        const record = await fetchQuery(
            api.applications.plugin.data.getByIdForJob,
            { id: pluginDataIdValue },
            { token },
        );
        if (!record) return NextResponse.json({ error: 'Plugin data not found' }, { status: 404 });
        await requirePermission(permissionCatalog.org.site.pluginData.manage.self, { request, siteId: record.siteId });
        let data: unknown;
        let jobId: Id<'jobLogs'> | undefined;

        const contentType = request.headers.get('content-type') ?? '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const dataValue = formData.get('data');
            if (typeof dataValue !== 'string') {
                return NextResponse.json({ error: 'data is required' }, { status: 400 });
            }

            data = JSON.parse(dataValue) as unknown;
            const jobIdValue = formData.get('jobId');
            if (typeof jobIdValue === 'string' && jobIdValue) {
                jobId = jobIdValue as Id<'jobLogs'>;
            }

            const uploadUrls = formData.getAll('uploadUrl');
            const files = formData.getAll('file');
            if (uploadUrls.length !== files.length) {
                return NextResponse.json({ error: 'uploadUrl and file counts must match' }, { status: 400 });
            }

            const uploadedImages = uploadUrls.flatMap((uploadUrl, index) => {
                const file = files[index];
                if (typeof uploadUrl !== 'string' || !(file instanceof File)) return [];
                return [{ externalUrl: uploadUrl, file }];
            });

            if (uploadedImages.length > 0) {
                data = await uploadImagesAndReplaceUrls({
                    data,
                    uploadedImages,
                    createUploadUrl: () =>
                        fetchMutation(
                            api.applications.plugin.data.createDataUploadUrl,
                            { id: pluginDataIdValue },
                            { token },
                        ),
                    getStoredFileUrl: (storageId) =>
                        fetchQuery(
                            api.applications.plugin.data.getStoredDataFileUrl,
                            { id: pluginDataIdValue, storageId },
                            { token },
                        ),
                });
            }
        } else {
            const body = (await request.json()) as { data?: unknown; jobId?: Id<'jobLogs'> };
            data = body.data;
            jobId = body.jobId;
        }

        if (data === undefined) {
            return NextResponse.json({ error: 'data is required' }, { status: 400 });
        }

        await fetchMutation(
            api.applications.plugin.data.patchDataForJob,
            { id: pluginDataIdValue, data, jobId },
            { token },
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
