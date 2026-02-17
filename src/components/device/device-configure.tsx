'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { type DataSource, DataSourcePicker } from '@/components/device/data-source-picker';
import type { Binding, DeviceData } from '@/components/device/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useOrg } from '@/components/org/org-context';
import type { Id } from '@convex/dataModel';

export function DeviceConfigure({ device }: { device: DeviceData }) {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const { org, permissions } = useOrg();

    // Metadata fields
    const [name, setName] = React.useState(device.name);
    const [description, setDescription] = React.useState(device.description ?? '');
    const [tags, setTags] = React.useState<string[]>(device.tags);
    const [tagInput, setTagInput] = React.useState('');
    const [status, setStatus] = React.useState<'pending' | 'active'>(device.status);

    // Frame & bindings
    const [selectedFrameId, setSelectedFrameId] = React.useState<Id<'frames'> | null>(device.frameId ?? null);
    const [bindings, setBindings] = React.useState<Binding[]>(device.dataBindings ?? []);

    const [isSaving, setIsSaving] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Sticky header visual treatment
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [isDocked, setIsDocked] = React.useState(false);

    React.useEffect(() => {
        const sentinel = sentinelRef.current;
        const scrollContainer = scrollRef.current;
        if (!sentinel || !scrollContainer) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsDocked(!entry.isIntersecting),
            { root: scrollContainer, threshold: 0 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const frames = useQuery(api.frames.listByOrganization, org ? { organizationId: org._id } : 'skip');
    const templates = useQuery(api.templates.crud.listByOrganization, org ? { organizationId: org._id } : 'skip');
    const plugins = useQuery(api.plugins.data.listPluginsWithTopics);

    const selectedFrame = frames?.find((f) => f._id === selectedFrameId);

    const updateDevice = useMutation(api.devices.update);
    const deleteDevice = useMutation(api.devices.remove);
    const setNextRender = useMutation(api.devices.setNext);
    const generateUploadUrl = useMutation(api.devices.generateUploadUrl);

    const getTemplateName = (templateId?: string) => {
        if (!templateId || !templates) return 'Untitled';
        return templates.find((t) => t._id === templateId)?.name ?? 'Untitled';
    };

    const getPluginName = (pluginId: Id<'plugins'>) => {
        return plugins?.find((p) => p._id === pluginId)?.name ?? pluginId;
    };

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const addBinding = (widgetId: string, source: DataSource) => {
        setBindings((prev) => [...prev, { widgetId, ...source }]);
    };

    const removeBinding = (index: number) => {
        setBindings((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates: Parameters<typeof updateDevice>[0] = {
                id: params.id,
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

            // Trigger render if frame is set
            if (selectedFrameId) {
                const res = await fetch('/api/v2/devices/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceId: params.id, orgSlug: params.slug }),
                });

                if (res.ok) {
                    const blob = await res.blob();
                    const uploadUrl = await generateUploadUrl();
                    const uploadRes = await fetch(uploadUrl, { method: 'POST', body: blob });
                    const { storageId } = await uploadRes.json();
                    await setNextRender({ deviceId: params.id, storageId, renderedAt: Date.now() });
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
            await deleteDevice({ id: params.id });
            router.push(`/org/${params.slug}/devices`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div ref={scrollRef} className="overflow-auto h-full">
            {/* Header — always sticky, visual treatment on scroll */}
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
                        <Button variant="outline" render={<Link href={`/org/${params.slug}/devices/${params.id}`} />} nativeButton={false}>
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

                {/* Device Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Device Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cfg-name">Name</Label>
                                <Input
                                    id="cfg-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Lobby Display"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cfg-description">Description</Label>
                                <Input
                                    id="cfg-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Main lobby entrance display"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cfg-tags">Tags</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="cfg-tags"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="Add tag..."
                                    />
                                    <Button type="button" variant="secondary" onClick={handleAddTag}>
                                        Add
                                    </Button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="gap-1 p-2.5">
                                                <span className="-mt-1">{tag}</span>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:bg-muted px-0"
                                                >
                                                    <X className="size-3" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={status === 'pending' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setStatus('pending')}
                                    >
                                        Pending
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={status === 'active' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setStatus('active')}
                                    >
                                        Active
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Frame Assignment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Frame Assignment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select
                                value={selectedFrameId ?? '__none__'}
                                onValueChange={(val) => {
                                    if (val === '__none__') {
                                        setSelectedFrameId(null);
                                        setBindings([]);
                                    } else {
                                        setSelectedFrameId(val as Id<'frames'>);
                                        setBindings([]);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-1/2">
                                    <SelectValue placeholder="Select a frame">
                                        <span className="truncate block">
                                            {selectedFrame ? selectedFrame.name : 'No frame'}
                                        </span>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    <SelectItem value="__none__">No frame</SelectItem>
                                    {frames?.map((f) => (
                                        <SelectItem key={f._id} value={f._id}>
                                            {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedFrame?.thumbnailUrl && (
                                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={selectedFrame.thumbnailUrl}
                                        alt={selectedFrame.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Data Bindings */}
                    {selectedFrame && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Data Bindings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedFrame.widgets.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No widgets in this frame.</p>
                                )}
                                {selectedFrame.widgets.map((widget) => {
                                    const widgetBindings = bindings.filter((b) => b.widgetId === widget.id);
                                    return (
                                        <div key={widget.id} className="space-y-2 space-x-2">
                                            <p className="text-sm font-medium">
                                                {getTemplateName(widget.templateId)}
                                                <span className="text-muted-foreground ml-1">
                                                    ({widget.w}x{widget.h})
                                                </span>
                                            </p>

                                            {widgetBindings.map((binding) => {
                                                const idx = bindings.indexOf(binding);
                                                return (
                                                    <Badge variant="secondary" key={idx} className="gap-2 text-sm p-3">
                                                        <span className="truncate flex-1">
                                                            {getPluginName(binding.pluginId)} &middot; {binding.topic}/{binding.entry}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => removeBinding(idx)}
                                                            className="text-muted-foreground hover:text-destructive px-0"
                                                        >
                                                            <X className="size-3.5" />
                                                        </Button>
                                                    </Badge>
                                                );
                                            })}

                                            {org && (
                                                <AddBindingRow
                                                    organizationId={org._id}
                                                    onAdd={(source) => addBinding(widget.id, source)}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}

                    {/* Danger Zone */}
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
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete Device'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AddBindingRow({
    organizationId,
    onAdd,
}: {
    organizationId: Id<'organizations'>;
    onAdd: (source: DataSource) => void;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                onClick={() => setIsOpen(true)}
                className="text-muted-foreground hover:text-foreground px-0"
            >
                <Plus className="size-3.5" />
                Add data source
            </Button>
        );
    }

    return (
        <div className="flex items-start gap-2">
            <DataSourcePicker
                organizationId={organizationId}
                onChange={(source) => {
                    onAdd(source);
                    setIsOpen(false);
                }}
            />
            <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground dark:hover:bg-transparent hover:bg-transparent"
            >
                <X className="size-3.5" />
            </Button>
        </div>
    );
}
