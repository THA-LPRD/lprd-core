'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { TemplateEditor } from '@/components/template/editor/template-editor';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { TemplateNotFound } from '@/components/ui/not-found';
import { buildEntitySlug, extractId } from '@/lib/slug';
import type { Id } from '@convex/dataModel';

export default function TemplateEditorPage() {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const rawId = extractId(params.id) as Id<'templates'>;

    const template = useQuery(api.templates.crud.getById, { id: rawId });

    React.useEffect(() => {
        if (template) {
            const correctSlug = buildEntitySlug(template.name, template._id);
            if (params.id !== correctSlug) {
                router.replace(`/site/${params.slug}/templates/${correctSlug}`);
            }
        }
    }, [template, params.id, params.slug, router]);

    if (template === undefined) {
        return (
            <div className="p-6">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-4" />
                <div className="flex gap-4">
                    <Skeleton className="flex-1 h-96" />
                    <Skeleton className="flex-1 h-96" />
                </div>
            </div>
        );
    }

    if (!template) {
        return <TemplateNotFound />;
    }

    return <TemplateEditor template={template} siteSlug={params.slug} />;
}
