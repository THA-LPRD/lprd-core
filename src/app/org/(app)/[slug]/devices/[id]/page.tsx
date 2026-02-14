'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DeviceForm } from '@/components/device/device-form';
import { DeviceStatusDot } from '@/components/device/device-status-dot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceNotFound } from '@/components/ui/not-found';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Edit, Monitor, Trash2 } from 'lucide-react';
import Link from 'next/link';

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return formatDate(timestamp);
}

export default function DeviceDetailPage() {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const [showEditForm, setShowEditForm] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Get device
    const device = useQuery(api.devices.getById, { id: params.id });

    // Get org for permissions
    const org = useQuery(api.organizations.getBySlug, { slug: params.slug });

    // Get current user's membership to check permissions
    const user = useQuery(api.users.me);
    const members = useQuery(api.organizations.listMembers, org ? { organizationId: org._id } : 'skip');

    const currentMember = React.useMemo(() => {
        if (!user || !members) return null;
        return members.find((m) => m.user?._id === user._id);
    }, [user, members]);

    const canManageDevices = user?.role === 'appAdmin' || currentMember?.role === 'orgAdmin';

    // Mutations
    const updateDevice = useMutation(api.devices.update);
    const deleteDevice = useMutation(api.devices.remove);

    const handleUpdateDevice = async (data: {
        name: string;
        description: string;
        tags: string[];
        status: 'pending' | 'active';
    }) => {
        await updateDevice({
            id: params.id,
            name: data.name,
            description: data.description || undefined,
            tags: data.tags,
            status: data.status,
        });
    };

    const handleDeleteDevice = async () => {
        setIsDeleting(true);
        try {
            await deleteDevice({ id: params.id });
            router.push(`/org/${params.slug}/devices`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Loading state
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

    return (
        <div className="p-6">
            {/* Back link */}
            <Link
                href={`/org/${params.slug}/devices`}
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
                    </div>
                    {device.description && <p className="text-muted-foreground">{device.description}</p>}
                </div>
                {canManageDevices && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowEditForm(true)}>
                            <Edit className="size-4 mr-2" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <Monitor className="size-16 text-muted-foreground/50" />
                        </div>
                    </CardContent>
                </Card>

                {/* Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Device ID</p>
                            <p className="font-mono text-sm">{device.id}</p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <DeviceStatusDot status={device.status} />
                                <span className="capitalize">{device.status}</span>
                            </div>
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
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <DeviceForm
                open={showEditForm}
                onOpenChange={setShowEditForm}
                onSubmit={handleUpdateDevice}
                initialData={{
                    name: device.name,
                    description: device.description ?? '',
                    tags: device.tags,
                    status: device.status,
                }}
                mode="edit"
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Device</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{device.name}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteDevice} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete Device'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
