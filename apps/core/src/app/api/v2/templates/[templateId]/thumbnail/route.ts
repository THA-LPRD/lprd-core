import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@shared/auth-errors';
import { requireAuthorization, requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ templateId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const token = authorization.accessToken;
        const { templateId } = await context.params;
        const templateIdValue = templateId as Id<'templates'>;
        const template = await fetchQuery(api.templates.crud.getById, { id: templateIdValue }, { token });
        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        if (template.scope === 'site' && template.siteId) {
            await requirePermission(permissionCatalog.org.site.template.manage.thumbnail.write, {
                request,
                siteId: template.siteId,
            });
        } else if (!authorization.can(permissionCatalog.org.template.manage.thumbnail.write)) {
            throw new AuthError('Forbidden', 403);
        }

        const formData = await request.formData();
        const jobId = formData.get('jobId') as Id<'jobLogs'> | null;
        const file = formData.get('file');
        if (!jobId || !(file instanceof File)) {
            return NextResponse.json({ error: 'jobId and file are required' }, { status: 400 });
        }

        const uploadUrl = await fetchMutation(
            api.templates.crud.createThumbnailUploadUrl,
            { id: templateIdValue },
            { token },
        );
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
        });
        if (!uploadResponse.ok) {
            return NextResponse.json({ error: `Upload failed: ${uploadResponse.status}` }, { status: 500 });
        }

        const uploadBody = (await uploadResponse.json()) as { storageId?: Id<'_storage'> };
        if (!uploadBody.storageId) {
            return NextResponse.json({ error: 'Upload did not return storageId' }, { status: 500 });
        }

        await fetchMutation(
            api.templates.crud.storeThumbnailForJob,
            { id: templateIdValue, storageId: uploadBody.storageId, jobId },
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
