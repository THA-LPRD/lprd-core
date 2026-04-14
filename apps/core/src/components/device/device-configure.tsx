'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { DataBindingsCard } from '@/components/device/data-bindings-card';
import { FrameAssignmentCard } from '@/components/device/frame-assignment-card';
import type { Binding, DeviceData } from '@/components/device/types';
import { DeviceWakePolicyForm } from '@/components/device/device-wake-policy-form';
import { Button } from '@workspace/ui/components/button';
import { ButtonGroup } from '@workspace/ui/components/button-group';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { Field, FieldLabel } from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import { Switch } from '@workspace/ui/components/switch';
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputList } from '@workspace/ui/components/tags-input';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSite } from '@/providers/site-provider';
import { extractId } from '@/lib/slug';
import { configureSiteDevice, deleteSiteDevice } from '@/lib/device-actions';
import { canAddTag, normalizeTags } from '@/lib/tags';
import type { Id } from '@convex/dataModel';

type ActiveTab = 'general' | 'display' | 'wake-policy';

const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'display', label: 'Display' },
    { id: 'wake-policy', label: 'Wake policy' },
];

export function DeviceConfigure({ device }: { device: DeviceData }) {
    const params = useParams<{ slug: string; id: string }>();
    const router = useRouter();
    const { site, permissions } = useSite();
    const rawId = extractId(params.id) as Id<'devices'>;

    const [activeTab, setActiveTab] = React.useState<ActiveTab>('general');

    // General tab state
    const [name, setName] = React.useState(device.name);
    const [description, setDescription] = React.useState(device.description ?? '');
    const [tags, setTags] = React.useState<string[]>(device.tags);
    const [status, setStatus] = React.useState<'pending' | 'active'>(device.status);

    // Display tab state
    const [selectedFrameId, setSelectedFrameId] = React.useState<Id<'frames'> | null>(device.frameId ?? null);
    const [bindings, setBindings] = React.useState<Binding[]>(device.dataBindings ?? []);
    const existingManualData = useQuery(api.devices.crud.getManualData, { deviceId: rawId });
    const [manualData, setManualData] = React.useState<Record<string, unknown>>({});
    const manualDataInitialized = React.useRef(false);

    React.useEffect(() => {
        if (existingManualData && !manualDataInitialized.current) {
            setManualData(existingManualData as Record<string, unknown>);
            manualDataInitialized.current = true;
        }
    }, [existingManualData]);

    // Wake policy tab state
    const [useCustomWakePolicy, setUseCustomWakePolicy] = React.useState(Boolean(device.wakePolicy));
    const [wakePolicy, setWakePolicy] = React.useState(() => device.wakePolicy ?? site.deviceWakePolicy);

    // Saving states
    const [isSavingGeneral, setIsSavingGeneral] = React.useState(false);
    const [isSavingDisplay, setIsSavingDisplay] = React.useState(false);
    const [isSavingWakePolicy, setIsSavingWakePolicy] = React.useState(false);

    // Delete
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Queries
    const frames = useQuery(api.frames.listBySite, site ? { siteId: site._id } : 'skip');
    const templates = useQuery(api.templates.crud.listBySite, site ? { siteId: site._id } : 'skip');
    const plugins = useQuery(api.applications.plugin.data.listPluginsWithTopics, site ? { siteId: site._id } : 'skip');
    const selectedFrame = frames?.find((f) => f._id === selectedFrameId);

    const getTemplateName = (templateId?: string) => {
        if (!templateId || !templates) return 'Untitled';
        return templates.find((t) => t._id === templateId)?.name ?? 'Untitled';
    };
    const getPluginName = (pluginId: Id<'applications'>) => plugins?.find((p) => p._id === pluginId)?.name ?? pluginId;

    // Save handlers
    const handleSaveGeneral = async () => {
        setIsSavingGeneral(true);
        try {
            await configureSiteDevice({
                siteId: site._id,
                deviceId: rawId,
                name: name.trim(),
                description: description.trim() || undefined,
                tags,
                status,
            });
            toast.success('General settings saved');
        } finally {
            setIsSavingGeneral(false);
        }
    };

    const handleSaveDisplay = async () => {
        setIsSavingDisplay(true);
        try {
            const result = await configureSiteDevice({
                siteId: site._id,
                deviceId: rawId,
                siteSlug: params.slug,
                manualEntries: selectedFrame
                    ? selectedFrame.widgets.map((w) => ({
                          widgetId: w.id,
                          data: manualData[w.id] ?? undefined,
                      }))
                    : [],
                ...(selectedFrameId ? { frameId: selectedFrameId, dataBindings: bindings } : { frameId: null }),
            });
            if (result.enqueueWarning) {
                toast.warning(`Saved, but ${result.enqueueWarning.toLowerCase()}`);
            } else {
                toast.success('Display settings saved');
            }
        } finally {
            setIsSavingDisplay(false);
        }
    };

    const handleSaveWakePolicy = async () => {
        setIsSavingWakePolicy(true);
        try {
            await configureSiteDevice({
                siteId: site._id,
                deviceId: rawId,
                wakePolicy: useCustomWakePolicy ? wakePolicy : null,
            });
            toast.success('Wake policy saved');
        } finally {
            setIsSavingWakePolicy(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteSiteDevice({ siteId: site._id, deviceId: rawId });
            router.push(`/site/${params.slug}/devices`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* Sticky header */}
            <div className="flex-shrink-0 bg-background border-b">
                <div className="px-6 pt-4 pb-0 flex items-center gap-3">
                    <Link
                        href={`/site/${params.slug}/devices/${params.id}`}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{device.name}</p>
                        <p className="text-xs text-muted-foreground">Configure</p>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="px-6 mt-3 flex gap-6">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'pb-3 text-sm transition-colors border-b-2 -mb-px',
                                activeTab === tab.id
                                    ? 'border-foreground text-foreground font-medium'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto">
                {/* General tab */}
                {activeTab === 'general' && (
                    <div className="px-6 py-6 space-y-5 max-w-lg">
                        <Field>
                            <FieldLabel htmlFor="cfg-name">Name</FieldLabel>
                            <Input
                                id="cfg-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Lobby Display"
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="cfg-description">Description</FieldLabel>
                            <Input
                                id="cfg-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Main lobby entrance display"
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="cfg-tags">Tags</FieldLabel>
                            <TagsInput
                                value={tags}
                                onValueChange={(value) => setTags(normalizeTags(value))}
                                onValidate={(value) => canAddTag(value, tags)}
                                blurBehavior="add"
                                addOnPaste
                            >
                                {({ value }) => (
                                    <TagsInputList>
                                        {value.map((tag) => (
                                            <TagsInputItem key={tag} value={tag}>
                                                {tag}
                                            </TagsInputItem>
                                        ))}
                                        <TagsInputInput
                                            id="cfg-tags"
                                            placeholder={value.length === 0 ? 'Add tags…' : ''}
                                        />
                                    </TagsInputList>
                                )}
                            </TagsInput>
                            <p className="text-xs text-muted-foreground">Enter to add · Backspace to remove last</p>
                        </Field>

                        <Field>
                            <FieldLabel>Status</FieldLabel>
                            <ButtonGroup>
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
                            </ButtonGroup>
                        </Field>

                        {permissions.org.site.device.manage && (
                            <div className="border-t pt-5 mt-2">
                                <p className="text-sm font-medium text-destructive">Delete device</p>
                                <p className="text-sm text-muted-foreground mt-1 mb-3">
                                    Permanently removes this device and all its data. Cannot be undone.
                                </p>
                                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                                    <Trash2 className="size-3.5 mr-1.5" />
                                    Delete device
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Display tab */}
                {activeTab === 'display' && (
                    <div className="px-6 py-6">
                        {selectedFrame && site ? (
                            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(280px,2fr)_2fr] gap-6 items-start">
                                <FrameAssignmentCard
                                    frames={frames}
                                    selectedFrameId={selectedFrameId}
                                    onFrameChange={(frameId) => {
                                        setSelectedFrameId(frameId);
                                        setBindings([]);
                                    }}
                                />
                                <DataBindingsCard
                                    widgets={selectedFrame.widgets}
                                    bindings={bindings}
                                    onBindingsChange={setBindings}
                                    manualData={manualData}
                                    onManualDataChange={(widgetId, data) =>
                                        setManualData((prev) => ({ ...prev, [widgetId]: data }))
                                    }
                                    siteId={site._id}
                                    getTemplateName={getTemplateName}
                                    getPluginName={getPluginName}
                                />
                            </div>
                        ) : (
                            <div className="max-w-sm">
                                <FrameAssignmentCard
                                    frames={frames}
                                    selectedFrameId={selectedFrameId}
                                    onFrameChange={(frameId) => {
                                        setSelectedFrameId(frameId);
                                        setBindings([]);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Wake policy tab */}
                {activeTab === 'wake-policy' && (
                    <div className="px-6 py-6 space-y-5 max-w-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium">Custom wake policy</p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Override the site-wide default for this device.
                                </p>
                            </div>
                            <Switch
                                id="custom-wake-policy"
                                checked={useCustomWakePolicy}
                                onCheckedChange={(checked) => {
                                    setUseCustomWakePolicy(checked);
                                    if (checked) setWakePolicy(device.wakePolicy ?? site.deviceWakePolicy);
                                }}
                            />
                        </div>

                        {useCustomWakePolicy && (
                            <div className="border-t pt-5">
                                <DeviceWakePolicyForm value={wakePolicy} onChange={setWakePolicy} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t bg-background px-6 py-3 flex justify-end">
                <Button
                    size="sm"
                    onClick={
                        activeTab === 'general'
                            ? handleSaveGeneral
                            : activeTab === 'display'
                              ? handleSaveDisplay
                              : handleSaveWakePolicy
                    }
                    disabled={
                        isSavingGeneral ||
                        isSavingDisplay ||
                        isSavingWakePolicy ||
                        (activeTab === 'general' && !name.trim())
                    }
                >
                    {isSavingGeneral || isSavingDisplay || isSavingWakePolicy ? 'Saving…' : 'Save'}
                </Button>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete device</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{device.name}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete device'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
