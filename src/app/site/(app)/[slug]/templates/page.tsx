'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { TemplateGrid } from '@/components/template/template-grid';
import { TemplateForm } from '@/components/template/template-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSite } from '@/providers/site-provider';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { buildEntitySlug } from '@/lib/slug';
import { STARTER_HTML, STARTER_SAMPLE_DATA } from '@/lib/template';
import { containsImgFuncs } from '@/lib/template-data';
import type { Id } from '@convex/dataModel';

export default function TemplatesPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = React.useState(false);

    const { site, permissions } = useSite();

    const templates = useQuery(api.templates.crud.listBySite, { siteId: site._id });

    const createTemplate = useMutation(api.templates.crud.create);
    const removeTemplate = useMutation(api.templates.crud.remove);
    const duplicateTemplate = useMutation(api.templates.crud.duplicate);
    const handleCreate = async (data: { name: string; description: string }) => {
        const id = await createTemplate({
            siteId: site._id,
            name: data.name,
            description: data.description || undefined,
            templateHtml: STARTER_HTML,
            sampleData: STARTER_SAMPLE_DATA,
            variants: [{ type: 'content', w: 3, h: 2 }],
            preferredVariantIndex: 0,
        });

        const nextJob = {
            type: 'template-thumbnail' as const,
            payload: { templateId: id, siteId: site._id, siteSlug: params.slug },
        };
        const response = await fetch('/api/v2/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                containsImgFuncs(STARTER_SAMPLE_DATA)
                    ? {
                          type: 'normalize-images',
                          resourceType: 'template',
                          resourceId: id,
                          siteId: site._id,
                          source: 'templateCreate',
                          payload: {
                              type: 'normalize-images',
                              payload: {
                                  resourceType: 'template',
                                  resourceId: id,
                                  siteId: site._id,
                                  source: 'templateCreate',
                                  nextJobs: [nextJob],
                              },
                          },
                      }
                    : {
                          type: 'template-thumbnail',
                          resourceType: 'template',
                          resourceId: id,
                          siteId: site._id,
                          source: 'templateCreate',
                          payload: nextJob,
                      },
            ),
        });
        if (!response.ok) {
            toast.error('Template created, but thumbnail generation failed to start');
        }

        router.push(`/site/${params.slug}/templates/${buildEntitySlug(data.name, id)}`);
    };

    const handleEdit = (id: string) => {
        const template = templates?.find((t) => t._id === id);
        const slug = template ? buildEntitySlug(template.name, id) : id;
        router.push(`/site/${params.slug}/templates/${slug}`);
    };

    const handleDelete = async (id: string) => {
        await removeTemplate({ id: id as Id<'templates'> });
    };

    const handleDuplicate = async (id: string) => {
        const newId = await duplicateTemplate({ id: id as Id<'templates'>, siteId: site._id });

        const source = templates?.find((t) => t._id === id);
        if (source) {
            const nextJob = {
                type: 'template-thumbnail' as const,
                payload: { templateId: newId, siteId: site._id, siteSlug: params.slug },
            };
            const response = await fetch('/api/v2/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    containsImgFuncs(source.sampleData)
                        ? {
                              type: 'normalize-images',
                              resourceType: 'template',
                              resourceId: newId,
                              siteId: site._id,
                              source: 'templateDuplicate',
                              payload: {
                                  type: 'normalize-images',
                                  payload: {
                                      resourceType: 'template',
                                      resourceId: newId,
                                      siteId: site._id,
                                      source: 'templateDuplicate',
                                      nextJobs: [nextJob],
                                  },
                              },
                          }
                        : {
                              type: 'template-thumbnail',
                              resourceType: 'template',
                              resourceId: newId,
                              siteId: site._id,
                              source: 'templateDuplicate',
                              payload: nextJob,
                          },
                ),
            });
            if (!response.ok) {
                toast.error('Template duplicated, but thumbnail generation failed to start');
            }
        }
    };

    if (templates === undefined) {
        return (
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
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
                    <p className="text-muted-foreground">Manage display templates in {site.name}</p>
                </div>
                {permissions.template.manage && (
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

            <TemplateForm open={showCreateForm} onOpenChangeAction={setShowCreateForm} onSubmitAction={handleCreate} />
        </div>
    );
}
