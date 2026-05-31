'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { TemplateGrid } from '@/components/template/template-grid';
import { TemplateForm } from '@/components/template/template-form';
import { Button } from '@workspace/ui/components/button';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { useSite } from '@/providers/site-provider';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { buildEntitySlug } from '@/lib/slug';
import { createSiteTemplate, deleteSiteTemplate, duplicateSiteTemplate } from '@/lib/template-actions';
import type { Id } from '@convex/dataModel';

export default function TemplatesPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = React.useState(false);

    const { site, permissions } = useSite();

    const templates = useQuery(api.templates.crud.listBySite, { siteId: site._id });

    const handleCreate = async (data: { name: string; description: string }) => {
        const result = await createSiteTemplate({
            siteId: site._id,
            siteSlug: params.slug,
            name: data.name,
            description: data.description || undefined,
        });
        if (result.enqueueWarning) {
            toast.warning(`Template created, but ${result.enqueueWarning.toLowerCase()}`);
        }

        router.push(`/site/${params.slug}/templates/${buildEntitySlug(data.name, result.id)}`);
    };

    const handleEdit = (id: string) => {
        const template = templates?.find((t) => t._id === id);
        const slug = template ? buildEntitySlug(template.name, id) : id;
        router.push(`/site/${params.slug}/templates/${slug}`);
    };

    const handleDelete = async (id: string) => {
        await deleteSiteTemplate({ siteId: site._id, templateId: id as Id<'templates'> });
    };

    const handleDuplicate = async (id: string) => {
        const result = await duplicateSiteTemplate({
            siteId: site._id,
            templateId: id as Id<'templates'>,
            siteSlug: params.slug,
        });

        if (result.enqueueWarning) {
            toast.warning(`Template duplicated, but ${result.enqueueWarning.toLowerCase()}`);
        }
    };

    if (templates === undefined) {
        return (
            <ScrollArea className="min-h-0 flex-1">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Skeleton className="h-8 w-32 mb-2" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-10 w-36" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                        ))}
                    </div>
                </div>
            </ScrollArea>
        );
    }

    return (
        <ScrollArea className="min-h-0 flex-1">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
                        <p className="text-muted-foreground">Manage display templates in {site.name}</p>
                    </div>
                    {permissions.org.site.template.manage && (
                        <Button onClick={() => setShowCreateForm(true)}>
                            <Plus className="size-4 mr-2" />
                            New Template
                        </Button>
                    )}
                </div>

                <TemplateGrid
                    templates={templates}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                />

                <TemplateForm
                    open={showCreateForm}
                    onOpenChangeAction={setShowCreateForm}
                    onSubmitAction={handleCreate}
                />
            </div>
        </ScrollArea>
    );
}
