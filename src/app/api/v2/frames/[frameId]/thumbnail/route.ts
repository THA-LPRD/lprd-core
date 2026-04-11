import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requireAuthorization, requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ frameId: string }> }) {
    try {
        const authorization = await requireAuthorization({ request });
        const token = authorization.accessToken;
        const { frameId } = await context.params;
        const frameIdValue = frameId as Id<'frames'>;
        const frame = await fetchQuery(api.frames.getById, { id: frameIdValue }, { token });
        if (!frame) return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
        await requirePermission(permissionCatalog.org.site.frame.manage.thumbnail.write, {
            request,
            siteId: frame.siteId,
        });
        const formData = await request.formData();
        const jobId = formData.get('jobId') as Id<'jobLogs'> | null;
        const file = formData.get('file');
        if (!jobId || !(file instanceof File)) {
            return NextResponse.json({ error: 'jobId and file are required' }, { status: 400 });
        }

        const uploadUrl = await fetchMutation(api.frames.createThumbnailUploadUrl, { id: frameIdValue }, { token });
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
            api.frames.storeThumbnailForJob,
            { id: frameIdValue, storageId: uploadBody.storageId, jobId },
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
