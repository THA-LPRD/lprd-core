'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DeviceDetail } from '@/components/device/device-detail';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceNotFound } from '@/components/ui/not-found';
import { buildEntitySlug, extractId } from '@/lib/slug';
import type { Id } from '@convex/dataModel';

export default function DeviceDetailPage() {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const rawId = extractId(params.id) as Id<'devices'>;
    const device = useQuery(api.devices.crud.getById, { id: rawId });

    React.useEffect(() => {
        if (device) {
            const correctSlug = buildEntitySlug(device.name, device._id);
            if (params.id !== correctSlug) {
                router.replace(`/site/${params.slug}/devices/${correctSlug}`);
            }
        }
    }, [device, params.id, params.slug, router]);

    if (device === undefined) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-10 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        );
    }

    if (!device) {
        return <DeviceNotFound backHref={`/site/${params.slug}/devices`} backLabel="Back to devices" />;
    }

    return <DeviceDetail device={device} />;
}
