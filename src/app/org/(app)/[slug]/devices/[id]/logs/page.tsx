'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DeviceLogTable } from '@/components/device/device-log-table';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceNotFound } from '@/components/ui/not-found';

export default function DeviceLogbookPage() {
    const params = useParams<{ slug: string; id: string }>();
    const device = useQuery(api.devices.crud.getById, { id: params.id });

    if (device === undefined) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    if (!device) {
        return <DeviceNotFound backHref={`/org/${params.slug}/devices`} backLabel="Back to devices" />;
    }

    return (
        <div className="p-6 overflow-auto h-full">
            <Link
                href={`/org/${params.slug}/devices/${params.id}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="size-4" />
                {device.name}
            </Link>

            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Logbook</h1>
                <p className="text-muted-foreground text-sm mt-1">All access events for this device, newest first.</p>
            </div>

            <DeviceLogTable deviceId={device._id} />
        </div>
    );
}
