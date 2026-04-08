import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { enqueueTemplateJobs } from '@/lib/resource-jobs';
import { STARTER_HTML, STARTER_SAMPLE_DATA } from '@/lib/template';

export const runtime = 'nodejs';

type CreateTemplateBody = {
    name?: string;
    description?: string;
    siteSlug?: string;
};

export async function POST(request: Request, context: { params: Promise<{ siteId: string }> }) {
    try {
        const { siteId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.template.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const token = authorization.accessToken;
        const body = (await request.json()) as CreateTemplateBody;

        if (!body.name?.trim() || !body.siteSlug) {
            return NextResponse.json({ error: 'name and siteSlug are required' }, { status: 400 });
        }

        const templateId = await fetchMutation(
            api.templates.crud.create,
            {
                siteId: siteId as Id<'sites'>,
                name: body.name.trim(),
                description: body.description?.trim() || undefined,
                templateHtml: STARTER_HTML,
                sampleData: STARTER_SAMPLE_DATA,
                variants: [{ type: 'content', w: 3, h: 2 }],
                preferredVariantIndex: 0,
            },
            { token },
        );

        const { warning } = await enqueueTemplateJobs({
            token,
            actorId: authorization.actor._id,
            templateId,
            siteId: siteId as Id<'sites'>,
            siteSlug: body.siteSlug,
            sampleData: STARTER_SAMPLE_DATA,
            source: 'templateCreate',
        });

        return NextResponse.json({ id: templateId, enqueueWarning: warning }, { status: 201 });
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
