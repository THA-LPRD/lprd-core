import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import { notFound } from 'next/navigation';
import { TemplateRenderClient } from '@/components/render/template-render-client';
import { getRenderPageToken } from '@/lib/render/page-auth';
import type { Id } from '@convex/dataModel';

export default async function TemplateRenderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getRenderPageToken();
    const bundle = await fetchQuery(
        api.templates.crud.getRenderBundle,
        { templateId: id as Id<'templates'> },
        { token },
    );

    if (!bundle) notFound();

    return <TemplateRenderClient bundle={bundle} />;
}
