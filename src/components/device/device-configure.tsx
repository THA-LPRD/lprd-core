'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DataBindingsCard } from '@/components/device/data-bindings-card';
import { DeviceInfoCard } from '@/components/device/device-info-card';
import { FrameAssignmentCard } from '@/components/device/frame-assignment-card';
import type { Binding, DeviceData } from '@/components/device/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useOrg } from '@/components/org/org-context';
import { extractId } from '@/lib/slug';
import type { Id } from '@convex/dataModel';

export function DeviceConfigure({ device }: { device: DeviceData }) {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const { org, permissions } = useOrg();
    const rawId = extractId(params.id) as Id<'devices'>;

    // Metadata fields
    const [name, setName] = React.useState(device.name);
    const [description, setDescription] = React.useState(device.description ?? '');
    const [tags, setTags] = React.useState<string[]>(device.tags);
    const [status, setStatus] = React.useState<'pending' | 'active'>(device.status);

    // Frame & bindings
    const [selectedFrameId, setSelectedFrameId] = React.useState<Id<'frames'> | null>(device.frameId ?? null);
    const [bindings, setBindings] = React.useState<Binding[]>(device.dataBindings ?? []);

    // Manual data per widget
    const existingManualData = useQuery(api.devices.crud.getManualData, { deviceId: rawId });
    const [manualData, setManualData] = React.useState<Record<string, unknown>>({});
    const manualDataInitialized = React.useRef(false);

    React.useEffect(() => {
        if (existingManualData && !manualDataInitialized.current) {
            setManualData(existingManualData as Record<string, unknown>);
            manualDataInitialized.current = true;
        }
    }, [existingManualData]);

    const [isSaving, setIsSaving] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Sticky header
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [isDocked, setIsDocked] = React.useState(false);

    React.useEffect(() => {
        const sentinel = sentinelRef.current;
        const scrollContainer = scrollRef.current;
        if (!sentinel || !scrollContainer) return;
        const observer = new IntersectionObserver(([entry]) => setIsDocked(!entry.isIntersecting), {
            root: scrollContainer,
            threshold: 0,
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const frames = useQuery(api.frames.listByOrganization, org ? { organizationId: org._id } : 'skip');
    const templates = useQuery(api.templates.crud.listByOrganization, org ? { organizationId: org._id } : 'skip');
    const plugins = useQuery(api.plugins.data.listPluginsWithTopics);

    const selectedFrame = frames?.find((f) => f._id === selectedFrameId);

    const updateDevice = useMutation(api.devices.crud.update);
    const deleteDevice = useMutation(api.devices.crud.remove);
    const saveManualDataMutation = useMutation(api.devices.crud.saveManualData);
    const setNextRender = useMutation(api.devices.render.setNext);
    const generateUploadUrl = useMutation(api.devices.render.generateUploadUrl);

    const getTemplateName = (templateId?: string) => {
        if (!templateId || !templates) return 'Untitled';
        return templates.find((t) => t._id === templateId)?.name ?? 'Untitled';
    };

    const getPluginName = (pluginId: Id<'plugins'>) => {
        return plugins?.find((p) => p._id === pluginId)?.name ?? pluginId;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates: Parameters<typeof updateDevice>[0] = {
                id: rawId,
                name: name.trim(),
                description: description.trim() || undefined,
                tags,
                status,
            };

            if (selectedFrameId) {
                updates.frameId = selectedFrameId;
                updates.dataBindings = bindings;
            } else {
                updates.clearFrame = true;
            }

            await updateDevice(updates);

            if (selectedFrameId && selectedFrame) {
                const entries = selectedFrame.widgets.map((w) => ({
                    widgetId: w.id,
                    data: manualData[w.id] ?? undefined,
                }));
                await saveManualDataMutation({ deviceId: rawId, entries });
            }

            if (selectedFrameId) {
                const res = await fetch('/api/v2/devices/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceId: rawId, orgSlug: params.slug }),
                });

                if (res.ok) {
                    const blob = await res.blob();
                    const uploadUrl = await generateUploadUrl();
                    const uploadRes = await fetch(uploadUrl, { method: 'POST', body: blob });
                    const { storageId } = await uploadRes.json();
                    await setNextRender({ deviceId: rawId, storageId, renderedAt: Date.now() });
                }
            }

            router.push(`/org/${params.slug}/devices/${params.id}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteDevice({ id: rawId });
            router.push(`/org/${params.slug}/devices`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div ref={scrollRef} className="overflow-auto h-full">
            <div
                className={`sticky top-0 z-10 px-6 py-4 transition-[box-shadow,border-color] ${
                    isDocked
                        ? 'bg-background/95 backdrop-blur-sm shadow-sm border-b'
                        : 'bg-background border-b border-transparent'
                }`}
            >
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href={`/org/${params.slug}/devices/${params.id}`}
                            className="inline-flex items-center text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <h1 className="text-xl font-semibold tracking-tight truncate">Configure: {device.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            render={<Link href={`/org/${params.slug}/devices/${params.id}`} />}
                            nativeButton={false}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6">
                <div ref={sentinelRef} />
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="space-y-6">
                        <DeviceInfoCard
                            name={name}
                            onNameChange={setName}
                            description={description}
                            onDescriptionChange={setDescription}
                            tags={tags}
                            onTagsChange={setTags}
                            status={status}
                            onStatusChange={setStatus}
                        />

                        <FrameAssignmentCard
                            frames={frames}
                            selectedFrameId={selectedFrameId}
                            onFrameChange={(frameId) => {
                                setSelectedFrameId(frameId);
                                setBindings([]);
                            }}
                        />

                        {selectedFrame && org && (
                            <DataBindingsCard
                                widgets={selectedFrame.widgets}
                                bindings={bindings}
                                onBindingsChange={setBindings}
                                manualData={manualData}
                                onManualDataChange={(widgetId, data) => {
                                    setManualData((prev) => ({ ...prev, [widgetId]: data }));
                                }}
                                organizationId={org._id}
                                getTemplateName={getTemplateName}
                                getPluginName={getPluginName}
                            />
                        )}

                        {permissions.device.manage && (
                            <Card className="border-destructive/50">
                                <CardHeader>
                                    <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Permanently delete this device. This action cannot be undone.
                                    </p>
                                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                        <Trash2 className="size-4 mr-2" />
                                        Delete Device
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

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
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete Device'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
