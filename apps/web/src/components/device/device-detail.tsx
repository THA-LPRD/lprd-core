'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { DeviceData } from '@/components/device/types';
import { DeviceStatusDot } from '@/components/device/device-status-dot';
import { DeviceActivityChart } from '@/components/device/device-activity-chart';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { ArrowLeft, Image as ImageIcon, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSite } from '@/providers/site-provider';
import { formatDate, formatRelativeTime } from '@/lib/date';

export function DeviceDetail({ device }: { device: DeviceData }) {
    const params = useParams<{ slug: string; id: string }>();
    const [previewTab, setPreviewTab] = React.useState<'last' | 'current' | 'queued'>('current');

    const { site, permissions } = useSite();

    const frames = useQuery(api.frames.listBySite, site ? { siteId: site._id } : 'skip');
    const assignedFrame = frames?.find((f) => f._id === device.frameId);

    return (
        <div className="p-6 overflow-auto h-full">
            {/* Back link */}
            <Link
                href={`/site/${params.slug}/devices`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
                <ArrowLeft className="size-4" />
                Back to devices
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
                        <DeviceStatusDot status={device.status} className="size-3" />
                        <JobStatusBadge latestJob={device.latestJob} />
                    </div>
                    {device.description && <p className="text-muted-foreground">{device.description}</p>}
                </div>
                {permissions.org.site.device.manage && (
                    <Button
                        variant="outline"
                        render={<Link href={`/site/${params.slug}/devices/${params.id}/configure`} />}
                        nativeButton={false}
                    >
                        <Settings className="size-4 mr-2" />
                        Edit
                    </Button>
                )}
            </div>

            {/* Activity */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Activity (last 7 days)</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            render={<Link href={`/site/${params.slug}/devices/${params.id}/logs`} />}
                            nativeButton={false}
                        >
                            View logbook
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <DeviceActivityChart deviceId={device._id} />
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
                {/* Left column — Preview */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Preview</CardTitle>
                            <div className="flex gap-1">
                                <Button
                                    variant={previewTab === 'last' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setPreviewTab('last')}
                                >
                                    Last
                                </Button>
                                <Button
                                    variant={previewTab === 'current' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setPreviewTab('current')}
                                >
                                    Current
                                </Button>
                                <Button
                                    variant={previewTab === 'queued' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setPreviewTab('queued')}
                                    className="relative"
                                >
                                    Queued
                                    {device.nextUrl && (
                                        <span className="absolute -top-1 -right-1 size-2.5 bg-blue-500 rounded-full" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="relative aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {previewTab === 'last' && device.lastUrl ? (
                                <Image
                                    style={{ objectFit: 'contain' }}
                                    fill
                                    unoptimized
                                    src={device.lastUrl}
                                    alt="Last"
                                />
                            ) : previewTab === 'current' && device.currentUrl ? (
                                <Image
                                    style={{ objectFit: 'contain' }}
                                    fill
                                    unoptimized
                                    priority
                                    src={device.currentUrl}
                                    alt="Current"
                                />
                            ) : previewTab === 'queued' && device.nextUrl ? (
                                <Image
                                    style={{ objectFit: 'contain' }}
                                    fill
                                    unoptimized
                                    src={device.nextUrl}
                                    alt="Queued"
                                />
                            ) : (
                                <ImageIcon className="size-16 text-muted-foreground/50" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right column — Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Device ID</p>
                                <p className="font-mono text-sm truncate">{device._id}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <DeviceStatusDot status={device.status} />
                                    <span className="capitalize">{device.status}</span>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Frame</p>
                                <p className="text-sm">{assignedFrame ? assignedFrame.name : 'None'}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Tags</p>
                                {device.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {device.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No tags</p>
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Last Seen</p>
                                <p className="text-sm">{formatRelativeTime(device.lastSeen)}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Created</p>
                                <p className="text-sm">{formatDate(device.createdAt)}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                                <p className="text-sm">{formatDate(device.updatedAt)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
