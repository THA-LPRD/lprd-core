import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization, requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { uploadImagesAndReplaceUrls } from '@/lib/server/imageUpload';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ templateId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const token = authorization.accessToken;
        const { templateId } = await context.params;
        const template = await fetchQuery(
            api.templates.crud.getByIdForJob,
            { id: templateId as Id<'templates'> },
            { token },
        );
        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        if (template.scope === 'site' && template.siteId) {
            await requirePermission(permissionCatalog.org.site.template.manage.sampleData.read, {
                request,
                siteId: template.siteId,
            });
        } else if (!authorization.can(permissionCatalog.org.template.manage.sampleData.read)) {
            throw new AuthError('Forbidden', 403);
        }

        return NextResponse.json(template);
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

export async function PATCH(request: Request, context: { params: Promise<{ templateId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const token = authorization.accessToken;
        const { templateId } = await context.params;
        const templateIdValue = templateId as Id<'templates'>;
        const template = await fetchQuery(api.templates.crud.getById, { id: templateIdValue }, { token });
        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        if (template.scope === 'site' && template.siteId) {
            await requirePermission(permissionCatalog.org.site.template.manage.sampleData.write, {
                request,
                siteId: template.siteId,
            });
        } else if (!authorization.can(permissionCatalog.org.template.manage.sampleData.write)) {
            throw new AuthError('Forbidden', 403);
        }

        let sampleData: unknown;
        let jobId: Id<'jobLogs'> | undefined;

        const contentType = request.headers.get('content-type') ?? '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const sampleDataValue = formData.get('sampleData');
            if (typeof sampleDataValue !== 'string') {
                return NextResponse.json({ error: 'sampleData is required' }, { status: 400 });
            }

            sampleData = JSON.parse(sampleDataValue) as unknown;
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
                sampleData = await uploadImagesAndReplaceUrls({
                    data: sampleData,
                    uploadedImages,
                    createUploadUrl: () =>
                        fetchMutation(api.templates.crud.createSampleDataUploadUrl, { id: templateIdValue }, { token }),
                    getStoredFileUrl: (storageId) =>
                        fetchQuery(
                            api.templates.crud.getSampleDataStoredFileUrl,
                            { id: templateIdValue, storageId },
                            { token },
                        ),
                });
            }
        } else {
            const body = (await request.json()) as { sampleData?: unknown; jobId?: Id<'jobLogs'> };
            sampleData = body.sampleData;
            jobId = body.jobId;
        }

        if (sampleData === undefined) {
            return NextResponse.json({ error: 'sampleData is required' }, { status: 400 });
        }

        await fetchMutation(
            api.templates.crud.patchSampleDataForJob,
            { id: templateIdValue, sampleData, jobId },
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
