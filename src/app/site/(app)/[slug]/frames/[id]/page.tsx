'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { FrameEditor } from '@/components/frame/editor/frame-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { FrameNotFound } from '@/components/ui/not-found';
import { buildEntitySlug, extractId } from '@/lib/slug';
import type { Id } from '@convex/dataModel';

export default function FrameEditorPage() {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const rawId = extractId(params.id) as Id<'frames'>;

    const frame = useQuery(api.frames.getById, { id: rawId });

    React.useEffect(() => {
        if (frame) {
            const correctSlug = buildEntitySlug(frame.name, frame._id);
            if (params.id !== correctSlug) {
                router.replace(`/site/${params.slug}/frames/${correctSlug}`);
            }
        }
    }, [frame, params.id, params.slug, router]);

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

    return <FrameEditor frame={frame} siteSlug={params.slug} />;
}
