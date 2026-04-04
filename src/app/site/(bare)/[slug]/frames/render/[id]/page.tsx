import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import { notFound } from 'next/navigation';
import { FrameRenderClient } from '@/components/render/frame-render-client';
import { getRenderPageToken } from '@/lib/render/page-auth';
import type { Id } from '@convex/dataModel';

export default async function FrameRenderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getRenderPageToken();
    const bundle = await fetchQuery(api.frames.getRenderBundle, { frameId: id as Id<'frames'> }, { token });

    if (!bundle) notFound();

    return <FrameRenderClient bundle={bundle} />;
}
