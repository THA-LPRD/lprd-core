import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import type { FunctionArgs } from 'convex/server';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { enqueueTemplateJobs } from '@/lib/resource-jobs';

export const runtime = 'nodejs';

type UpdateTemplateBody = Omit<FunctionArgs<typeof api.templates.crud.update>, 'id'> & {
    siteSlug?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ siteId: string; templateId: string }> }) {
    try {
        const { siteId, templateId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.template.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const token = authorization.accessToken;
        const body = (await request.json()) as UpdateTemplateBody;

        if (!body.siteSlug) {
            return NextResponse.json({ error: 'siteSlug is required' }, { status: 400 });
        }

        await fetchMutation(
            api.templates.crud.update,
            {
                id: templateId as Id<'templates'>,
                name: body.name,
                description: body.description,
                templateHtml: body.templateHtml,
                sampleData: body.sampleData,
                variants: body.variants,
                preferredVariantIndex: body.preferredVariantIndex,
                thumbnailStorageId: body.thumbnailStorageId,
            },
            { token },
        );

        const { warning } = await enqueueTemplateJobs({
            token,
            actorId: authorization.actor._id,
            templateId: templateId as Id<'templates'>,
            siteId: siteId as Id<'sites'>,
            siteSlug: body.siteSlug,
            sampleData: body.sampleData,
            source: 'templateSave',
        });

        return NextResponse.json({ ok: true, enqueueWarning: warning });
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

export async function DELETE(request: Request, context: { params: Promise<{ siteId: string; templateId: string }> }) {
    try {
        const { siteId, templateId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.template.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });

        await fetchMutation(
            api.templates.crud.remove,
            { id: templateId as Id<'templates'> },
            { token: authorization.accessToken },
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
