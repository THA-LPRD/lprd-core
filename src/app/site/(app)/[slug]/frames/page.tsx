'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { FrameGridView } from '@/components/frame/frame-grid';
import { FrameForm } from '@/components/frame/frame-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSite } from '@/providers/site-provider';
import { Plus } from 'lucide-react';
import { GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import { buildEntitySlug } from '@/lib/slug';
import type { Id } from '@convex/dataModel';

export default function FramesPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = React.useState(false);

    const { site, permissions } = useSite();

    const frames = useQuery(api.frames.listBySite, { siteId: site._id });

    const createFrame = useMutation(api.frames.create);
    const removeFrame = useMutation(api.frames.remove);
    const duplicateFrame = useMutation(api.frames.duplicate);

    const handleCreate = async (data: { name: string; description: string }) => {
        const id = await createFrame({
            siteId: site._id,
            name: data.name,
            description: data.description || undefined,
            widgets: [
                {
                    id: crypto.randomUUID(),
                    x: 0,
                    y: 0,
                    w: GRID_COLS,
                    h: GRID_ROWS,
                },
            ],
        });

        router.push(`/site/${params.slug}/frames/${buildEntitySlug(data.name, id)}`);
    };

    const handleEdit = (id: string) => {
        const frame = frames?.find((f) => f._id === id);
        const slug = frame ? buildEntitySlug(frame.name, id) : id;
        router.push(`/site/${params.slug}/frames/${slug}`);
    };

    const handleDelete = async (id: string) => {
        await removeFrame({ id: id as Id<'frames'> });
    };

    const handleDuplicate = async (id: string) => {
        await duplicateFrame({ id: id as Id<'frames'>, siteId: site._id });
    };

    if (frames === undefined) {
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
                        <Skeleton key={i} className="aspect-video rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Frames</h1>
                    <p className="text-muted-foreground">Manage display frames in {site.name}</p>
                </div>
                {permissions.frame.manage && (
                    <Button onClick={() => setShowCreateForm(true)}>
                        <Plus className="size-4 mr-2" />
                        New Frame
                    </Button>
                )}
            </div>

            <FrameGridView
                frames={frames}
                canManage={permissions.frame.manage}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
            />

            <FrameForm open={showCreateForm} onOpenChangeAction={setShowCreateForm} onSubmitAction={handleCreate} />
        </div>
    );
}
