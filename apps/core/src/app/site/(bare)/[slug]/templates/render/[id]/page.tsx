import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { notFound } from 'next/navigation';
import { AuthError } from '@shared/auth-errors';
import { permissionCatalog } from '@/lib/permissions';
import { TemplateRenderClient } from '@/components/render/template-render-client';
import { requireAuthorization } from '@/lib/authz';

export default async function TemplateRenderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let token: string;

    try {
        const authorization = await requireAuthorization();
        if (
            authorization.application &&
            !authorization.can(permissionCatalog.org.template.view) &&
            !authorization.can(permissionCatalog.org.site.template.view)
        ) {
            notFound();
        }
        token = authorization.accessToken;
    } catch (error) {
        if (error instanceof AuthError) {
            notFound();
        }
        throw error;
    }

    const bundle = await fetchQuery(
        api.templates.crud.getRenderBundle,
        { templateId: id as Id<'templates'> },
        { token },
    );

    if (!bundle) notFound();

    return <TemplateRenderClient bundle={bundle} />;
}
