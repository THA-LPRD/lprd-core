'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { DeviceStatusDot } from './device-status-dot';
import { Monitor } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date';
import { buildEntitySlug } from '@/lib/slug';
import type { Id } from '@convex/dataModel';
import Image from 'next/image';

type Device = {
    _id: Id<'devices'>;
    siteId: Id<'sites'>;
    name: string;
    description?: string;
    tags: string[];
    status: 'pending' | 'active';
    lastSeen?: number;
    currentUrl?: string | null;
    latestJob?: { status: 'pending' | 'running' | 'succeeded' | 'failed'; errorMessage?: string };
    createdAt: number;
    updatedAt: number;
};

export function DeviceCard({ device, siteSlug }: { device: Device; siteSlug: string }) {
    return (
        <Link href={`/site/${siteSlug}/devices/${buildEntitySlug(device.name, device._id)}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden">
                {/* Device preview area */}
                <div className="relative aspect-video bg-muted flex items-center justify-center border-b overflow-hidden">
                    {device.currentUrl ? (
                        <Image objectFit="contain" fill src={device.currentUrl} alt={device.name} />
                    ) : (
                        <Monitor className="size-12 text-muted-foreground/50" />
                    )}
                </div>

                <CardContent className="p-4">
                    {/* Name with status */}
                    <div className="flex items-center gap-2 mb-1">
                        <DeviceStatusDot status={device.status} />
                        <h3 className="font-medium truncate">{device.name}</h3>
                        <JobStatusBadge latestJob={device.latestJob} />
                    </div>

                    {/* Tags */}
                    {device.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {device.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {device.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{device.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Last seen */}
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(device.lastSeen)}</p>
                </CardContent>
            </Card>
        </Link>
    );
}
