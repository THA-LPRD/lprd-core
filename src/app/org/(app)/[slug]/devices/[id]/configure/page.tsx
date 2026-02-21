'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DeviceConfigure } from '@/components/device/device-configure';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceNotFound } from '@/components/ui/not-found';

export default function DeviceConfigurePage() {
    const params = useParams<{ slug: string; id: string }>();
    const device = useQuery(api.devices.crud.getById, { id: params.id });

    if (device === undefined) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <Skeleton className="h-10 w-64 mb-2" />
                </div>
                <div className="space-y-6 max-w-2xl">
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-48 rounded-lg" />
                    <Skeleton className="h-48 rounded-lg" />
                </div>
            </div>
        );
    }

    if (!device) {
        return <DeviceNotFound backHref={`/org/${params.slug}/devices`} backLabel="Back to devices" />;
    }

    return <DeviceConfigure device={device} />;
}
