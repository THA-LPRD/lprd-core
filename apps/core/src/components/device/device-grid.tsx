'use client';

import { DeviceCard } from './device-card';
import type { Id } from '@convex/dataModel';

type Device = {
    _id: Id<'devices'>;
    siteId: Id<'sites'>;
    name: string;
    description?: string;
    tags: string[];
    status: 'pending' | 'active';
    lastSeen?: number;
    currentUrl?: string | null;
    createdAt: number;
    updatedAt: number;
};

export function DeviceGrid({ devices, siteSlug }: { devices: Device[]; siteSlug: string }) {
    if (devices.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No devices yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first device to get started</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {devices.map((device) => (
                <DeviceCard key={device._id} device={device} siteSlug={siteSlug} />
            ))}
        </div>
    );
}
