'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DeviceDetail } from '@/components/device/device-detail';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceNotFound } from '@/components/ui/not-found';

export default function DeviceDetailPage() {
    const params = useParams<{ slug: string; id: string }>();
    const device = useQuery(api.devices.crud.getById, { id: params.id });

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
        return <DeviceNotFound backHref={`/org/${params.slug}/devices`} backLabel="Back to devices" />;
    }

    return <DeviceDetail device={device} />;
}
