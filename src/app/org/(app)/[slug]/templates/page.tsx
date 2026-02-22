'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { TemplateGrid } from '@/components/template/template-grid';
import { TemplateForm } from '@/components/template/template-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrg } from '@/components/org/org-context';
import { Plus } from 'lucide-react';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import type { Id } from '@convex/dataModel';

export default function TemplatesPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = React.useState(false);

    const { org, permissions } = useOrg();

    const templates = useQuery(api.templates.crud.listByOrganization, { organizationId: org._id });

    const createTemplate = useMutation(api.templates.crud.create);
    const removeTemplate = useMutation(api.templates.crud.remove);
    const duplicateTemplate = useMutation(api.templates.crud.duplicate);
    const generateUploadUrl = useMutation(api.templates.crud.generateUploadUrl);
    const storeTemplateThumbnail = useMutation(api.templates.crud.storeThumbnail);

    const starterHtml = `<div>
  <style>
    .title { font-size: 1.2em; font-weight: bold; }
    .row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  </style>

  <div class="title">{{ title }}</div>
  <span>{{ message }}</span>

  <!-- Font Awesome solid (default) — fontawesome.com/icons?f=classic&s=solid -->
  <div class="row">
    <img-fa name="sun"></img-fa>
    <span>FA solid: sun</span>
  </div>

  <!-- Font Awesome regular — fontawesome.com/icons?f=classic&s=regular -->
  <div class="row">
    <img-fa name="heart" set="regular"></img-fa>
    <span>FA regular: heart</span>
  </div>

  <!-- Font Awesome brands — fontawesome.com/icons?f=brands -->
  <div class="row">
    <img-fa name="github" set="brands"></img-fa>
    <span>FA brands: github</span>
  </div>

  <!-- Lucide icon — lucide.dev/icons -->
  <div class="row">
    <img-lucide name="moon"></img-lucide>
    <span>Lucide: moon</span>
  </div>
</div>`;

    const starterSampleData = {
        title: 'Hello World',
        message: 'Edit this template to get started.',
    };

    const handleCreate = async (data: { name: string; description: string }) => {
        const id = await createTemplate({
            organizationId: org._id,
            name: data.name,
            description: data.description || undefined,
            templateHtml: starterHtml,
            sampleData: starterSampleData,
            variants: [{ type: 'content', w: 3, h: 2 }],
            preferredVariantIndex: 0,
        });

        // Generate initial thumbnail
        try {
            const res = await fetch('/api/v2/templates/createThumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: id,
                    orgSlug: params.slug,
                    variantIndex: 0,
                    width: 3 * DEFAULT_CELL_SIZE,
                    height: 2 * DEFAULT_CELL_SIZE,
                }),
            });
            if (res.ok) {
                const blob = await res.blob();
                if (blob.size) {
                    const uploadUrl = await generateUploadUrl();
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'image/png' },
                        body: blob,
                    });
                    const { storageId } = await uploadRes.json();
                    await storeTemplateThumbnail({ id, storageId });
                }
            }
        } catch {
            // Non-critical — template is created, thumbnail can be generated on first save
        }

        router.push(`/org/${params.slug}/templates/${id}`);
    };

    const handleEdit = (id: string) => {
        router.push(`/org/${params.slug}/templates/${id}`);
    };

    const handleDelete = async (id: string) => {
        await removeTemplate({ id: id as Id<'templates'> });
    };

    const handleDuplicate = async (id: string) => {
        const newId = await duplicateTemplate({ id: id as Id<'templates'>, organizationId: org._id });

        // Generate thumbnail for the new copy
        const source = templates?.find((t) => t._id === id);
        if (source) {
            const preferred = source.variants[source.preferredVariantIndex];
            const width =
                preferred?.type === 'content' ? preferred.w * DEFAULT_CELL_SIZE : GRID_COLS * DEFAULT_CELL_SIZE;
            const height =
                preferred?.type === 'content' ? preferred.h * DEFAULT_CELL_SIZE : GRID_ROWS * DEFAULT_CELL_SIZE;

            try {
                const res = await fetch('/api/v2/templates/createThumbnail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        templateId: newId,
                        orgSlug: params.slug,
                        variantIndex: source.preferredVariantIndex,
                        width,
                        height,
                    }),
                });
                if (res.ok) {
                    const blob = await res.blob();
                    if (blob.size) {
                        const uploadUrl = await generateUploadUrl();
                        const uploadRes = await fetch(uploadUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'image/png' },
                            body: blob,
                        });
                        const { storageId } = await uploadRes.json();
                        await storeTemplateThumbnail({ id: newId, storageId });
                    }
                }
            } catch {
                // Non-critical — thumbnail can be generated on first save
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
                    <p className="text-muted-foreground">Manage display templates in {org.name}</p>
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
