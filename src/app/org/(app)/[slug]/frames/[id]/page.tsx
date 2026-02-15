'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { FrameEditor } from '@/components/frame/editor/frame-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { FrameNotFound } from '@/components/ui/not-found';
import type { Id } from '@convex/dataModel';

export default function FrameEditorPage() {
    const params = useParams<{ slug: string; id: string }>();

    const frame = useQuery(api.frames.getById, {
        id: params.id as Id<'frames'>,
    });

    if (frame === undefined) {
        return (
            <div className="p-6">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="flex-1 h-96" />
            </div>
        );
    }

    if (!frame) {
        return <FrameNotFound />;
    }

    return <FrameEditor frame={frame} orgSlug={params.slug} />;
}
