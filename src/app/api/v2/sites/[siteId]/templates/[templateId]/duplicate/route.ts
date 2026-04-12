import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { permissionCatalog } from '@/lib/permissions';
import { enqueueTemplateJobs } from '@/lib/resource-jobs';

export const runtime = 'nodejs';

type DuplicateTemplateBody = {
    siteSlug?: string;
};

export async function POST(request: Request, context: { params: Promise<{ siteId: string; templateId: string }> }) {
    try {
        const { siteId, templateId } = await context.params;
        const authorization = await requirePermission(permissionCatalog.org.site.template.manage.self, {
            request,
            siteId: siteId as Id<'sites'>,
        });
        const token = authorization.accessToken;
        const body = (await request.json()) as DuplicateTemplateBody;

        if (!body.siteSlug) {
            return NextResponse.json({ error: 'siteSlug is required' }, { status: 400 });
        }

        const duplicatedTemplateId = await fetchMutation(
            api.templates.crud.duplicate,
            { id: templateId as Id<'templates'>, siteId: siteId as Id<'sites'> },
            { token },
        );

        const { warning } = await enqueueTemplateJobs({
            token,
            actorId: authorization.actor._id,
            templateId: duplicatedTemplateId,
            siteId: siteId as Id<'sites'>,
            siteSlug: body.siteSlug,
            source: 'templateDuplicate',
        });

        return NextResponse.json({ id: duplicatedTemplateId, enqueueWarning: warning }, { status: 201 });
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
