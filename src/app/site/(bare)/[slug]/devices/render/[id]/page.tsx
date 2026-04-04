import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import { notFound } from 'next/navigation';
import { DeviceRenderClient } from '@/components/render/device-render-client';
import { getRenderPageToken } from '@/lib/render/page-auth';
import type { Id } from '@convex/dataModel';

export default async function DeviceRenderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getRenderPageToken();
    const bundle = await fetchQuery(api.devices.render.getRenderBundle, { deviceId: id as Id<'devices'> }, { token });

    if (!bundle) notFound();

    return <DeviceRenderClient bundle={bundle} />;
}
