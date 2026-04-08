import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { permissionCatalog } from '@/lib/permissions';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ deviceId: string }> }) {
    try {
        const authorization = await requirePermission(permissionCatalog.org.site.device.manage.artifact.write, {
            request,
        });
        const token = authorization.accessToken;
        const { deviceId } = await context.params;
        const deviceIdValue = deviceId as Id<'devices'>;
        const formData = await request.formData();
        const jobId = formData.get('jobId') as Id<'jobs'> | null;
        const renderedAtValue = formData.get('renderedAt');
        const renderedAt = renderedAtValue ? Number(renderedAtValue) : null;
        const file = formData.get('file');
        if (!jobId || !renderedAt || !(file instanceof File)) {
            return NextResponse.json({ error: 'jobId, renderedAt, and file are required' }, { status: 400 });
        }

        const uploadUrl = await fetchMutation(
            api.devices.crud.createRenderUploadUrl,
            { deviceId: deviceIdValue },
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
            api.devices.crud.setNextRenderForJob,
            {
                deviceId: deviceIdValue,
                storageId: uploadBody.storageId,
                renderedAt,
                jobId,
            },
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
