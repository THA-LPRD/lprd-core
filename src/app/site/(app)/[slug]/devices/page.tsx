'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DeviceGrid } from '@/components/device/device-grid';
import { DeviceForm } from '@/components/device/device-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSite } from '@/providers/site-provider';
import { buildEntitySlug } from '@/lib/slug';
import { Plus } from 'lucide-react';
import { createSiteDevice } from '@/lib/device-actions';

export default function DevicesPage() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();
    const [showAddForm, setShowAddForm] = React.useState(false);

    const { site, permissions } = useSite();

    const devices = useQuery(api.devices.crud.listBySite, { siteId: site._id });

    const handleCreateDevice = async (data: { name: string; description: string; tags: string[] }) => {
        const result = await createSiteDevice({
            siteId: site._id,
            name: data.name,
            description: data.description || undefined,
            tags: data.tags,
        });
        router.push(`/site/${params.slug}/devices/${buildEntitySlug(data.name, result.id)}`);
    };

    if (devices === undefined) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-28" />
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
                    <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
                    <p className="text-muted-foreground">Manage devices in {site.name}</p>
                </div>
                {permissions.org.site.device.manage && (
                    <Button onClick={() => setShowAddForm(true)}>
                        <Plus className="size-4 mr-2" />
                        Add Device
                    </Button>
                )}
            </div>

            <DeviceGrid devices={devices} siteSlug={params.slug} />

            <DeviceForm open={showAddForm} onOpenChange={setShowAddForm} onSubmit={handleCreateDevice} mode="create" />
        </div>
    );
}
