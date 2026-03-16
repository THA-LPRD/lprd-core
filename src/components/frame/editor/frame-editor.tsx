'use client';

import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from './editor-toolbar';
import { FrameCanvas } from './frame-canvas';
import { WidgetConfigPanel } from './widget-config-panel';
import { LayerControls } from './layer-controls';
import { AddWidgetDialog } from './add-widget-dialog';
import { type TemplateOption, TemplatePicker, type TemplateSelection } from './template-picker';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import type { Id } from '@convex/dataModel';
import type { TemplateVariant } from '@/lib/template';

type Widget = {
    id: string;
    templateId?: Id<'templates'>;
    variantIndex?: number;
    x: number;
    y: number;
    w: number;
    h: number;
};

type LayerRef = {
    templateId: Id<'templates'>;
    variantIndex: number;
};

type FrameDoc = {
    _id: Id<'frames'>;
    siteId: Id<'sites'>;
    name: string;
    description?: string;
    widgets: Widget[];
    background?: LayerRef;
    backgroundColor?: string;
    foreground?: LayerRef;
};

type PickerTarget = 'widget' | 'background' | 'foreground';

export function FrameEditor({ frame, siteSlug }: { frame: FrameDoc; siteSlug: string }) {
    const [name, setName] = React.useState(frame.name);
    const [widgets, setWidgets] = React.useState<Widget[]>(frame.widgets);
    const [background, setBackground] = React.useState<LayerRef | undefined>(frame.background);
    const [backgroundColor, setBackgroundColor] = React.useState<string | undefined>(frame.backgroundColor);
    const [foreground, setForeground] = React.useState<LayerRef | undefined>(frame.foreground);
    const [selectedWidgetId, setSelectedWidgetId] = React.useState<string | null>(null);
    const [isDirty, setIsDirty] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [showAddWidget, setShowAddWidget] = React.useState(false);
    const [pickerTarget, setPickerTarget] = React.useState<PickerTarget | null>(null);

    const updateFrame = useMutation(api.frames.update);
    const storeThumbnail = useMutation(api.frames.storeThumbnail);
    const generateUploadUrl = useMutation(api.frames.generateUploadUrl);

    // Fetch templates for this org
    const templates = useQuery(api.templates.crud.listBySite, {
        siteId: frame.siteId,
    });

    const templateOptions: TemplateOption[] = React.useMemo(
        () =>
            (templates ?? []).map((t) => ({
                _id: t._id,
                name: t.name,
                thumbnailUrl: t.thumbnailUrl,
                variants: t.variants,
            })),
        [templates],
    );

    // Build a map of template docs for preview rendering
    const templateDocs = React.useMemo(() => {
        const map = new Map<
            string,
            { _id: Id<'templates'>; templateHtml: string; sampleData?: unknown; variants: TemplateVariant[] }
        >();
        for (const t of templates ?? []) {
            map.set(t._id, {
                _id: t._id,
                templateHtml: t.templateHtml,
                sampleData: t.sampleData,
                variants: t.variants,
            });
        }
        return map;
    }, [templates]);

    // Track dirty state
    React.useEffect(() => {
        const changed =
            name !== frame.name ||
            JSON.stringify(widgets) !== JSON.stringify(frame.widgets) ||
            JSON.stringify(background) !== JSON.stringify(frame.background) ||
            backgroundColor !== frame.backgroundColor ||
            JSON.stringify(foreground) !== JSON.stringify(frame.foreground);
        setIsDirty(changed);
    }, [name, widgets, background, backgroundColor, foreground, frame]);

    const selectedWidget = selectedWidgetId ? (widgets.find((w) => w.id === selectedWidgetId) ?? null) : null;

    // Generate thumbnail via server-side Playwright screenshot
    const generateThumbnail = React.useCallback(async (): Promise<Id<'_storage'> | null> => {
        try {
            const res = await fetch('/api/v2/frames/createThumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frameId: frame._id,
                    siteSlug,
                    width: GRID_COLS * DEFAULT_CELL_SIZE,
                    height: GRID_ROWS * DEFAULT_CELL_SIZE,
                }),
            });

            if (!res.ok) return null;

            const blob = await res.blob();
            if (!blob.size) return null;

            const uploadUrl = await generateUploadUrl();
            const uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'image/png' },
                body: blob,
            });
            const { storageId } = await uploadRes.json();
            return storageId as Id<'_storage'>;
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
            return null;
        }
    }, [frame._id, siteSlug, generateUploadUrl]);

    const handleSave = async () => {
        if (!isDirty) return;
        setIsSaving(true);

        try {
            await updateFrame({
                id: frame._id,
                name,
                widgets,
                background,
                backgroundColor,
                foreground,
                clearBackground: !background,
                clearBackgroundColor: !backgroundColor,
                clearForeground: !foreground,
            });

            // Generate and save thumbnail
            const storageId = await generateThumbnail();
            if (storageId) {
                await storeThumbnail({ id: frame._id, storageId });
                toast.success('Frame saved');
            } else {
                toast.warning('Frame saved, but thumbnail generation failed');
            }
        } catch {
            toast.error('Failed to save frame');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMoveWidget = (id: string, x: number, y: number) => {
        setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)));
    };

    const handleUpdateWidget = (updates: Partial<Widget>) => {
        if (!selectedWidgetId) return;
        setWidgets((prev) => prev.map((w) => (w.id === selectedWidgetId ? { ...w, ...updates } : w)));
    };

    const handleRemoveWidget = () => {
        if (!selectedWidgetId) return;
        setWidgets((prev) => prev.filter((w) => w.id !== selectedWidgetId));
        setSelectedWidgetId(null);
    };

    const handleAddWidget = (widget: Widget) => {
        setWidgets((prev) => [...prev, widget]);
    };

    // Template picker filter based on target
    const pickerFilter = React.useCallback(
        (variant: TemplateVariant): boolean => {
            if (pickerTarget === 'background') return variant.type === 'background';
            if (pickerTarget === 'foreground') return variant.type === 'foreground';
            if (pickerTarget === 'widget' && selectedWidget) {
                return variant.type === 'content' && variant.w === selectedWidget.w && variant.h === selectedWidget.h;
            }
            return variant.type === 'content';
        },
        [pickerTarget, selectedWidget],
    );

    const handleSelectBackgroundColor = React.useCallback((color: string) => {
        setBackgroundColor(color);
        setBackground(undefined);
    }, []);

    const handleClearBackground = React.useCallback(() => {
        setBackground(undefined);
        setBackgroundColor(undefined);
    }, []);

    const handleTemplateSelect = (selection: TemplateSelection) => {
        if (pickerTarget === 'background') {
            setBackground(selection);
            setBackgroundColor(undefined);
        } else if (pickerTarget === 'foreground') {
            setForeground(selection);
        } else if (pickerTarget === 'widget' && selectedWidgetId) {
            handleUpdateWidget({
                templateId: selection.templateId,
                variantIndex: selection.variantIndex,
            });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-52px)] overflow-hidden">
            <EditorToolbar
                siteSlug={siteSlug}
                name={name}
                onNameChange={setName}
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={handleSave}
            />

            <LayerControls
                background={background}
                backgroundColor={backgroundColor}
                foreground={foreground}
                templates={templateOptions}
                onPickBackground={() => setPickerTarget('background')}
                onPickForeground={() => setPickerTarget('foreground')}
                onClearBackground={handleClearBackground}
                onClearForeground={() => setForeground(undefined)}
            />

            <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-background">
                <Button variant="outline" size="sm" onClick={() => setShowAddWidget(true)} className="text-xs h-7">
                    <Plus className="size-3 mr-1" />
                    Add Widget
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                    {GRID_COLS}×{GRID_ROWS} grid
                </span>
            </div>

            <div className="flex-1 flex min-h-0 overflow-hidden">
                <FrameCanvas
                    widgets={widgets}
                    selectedWidgetId={selectedWidgetId}
                    onSelectWidget={setSelectedWidgetId}
                    onMoveWidget={handleMoveWidget}
                    background={background}
                    backgroundColor={backgroundColor}
                    foreground={foreground}
                    templateDocs={templateDocs}
                />

                {selectedWidget && (
                    <WidgetConfigPanel
                        widget={selectedWidget}
                        templates={templateOptions}
                        onUpdate={handleUpdateWidget}
                        onRemove={handleRemoveWidget}
                        onClose={() => setSelectedWidgetId(null)}
                        onPickTemplate={() => setPickerTarget('widget')}
                    />
                )}
            </div>

            <AddWidgetDialog
                open={showAddWidget}
                onOpenChange={setShowAddWidget}
                existingWidgets={widgets}
                onAdd={handleAddWidget}
            />

            <TemplatePicker
                open={pickerTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setPickerTarget(null);
                }}
                templates={templateOptions}
                filter={pickerFilter}
                onSelect={handleTemplateSelect}
                mode={pickerTarget === 'background' ? 'background' : 'default'}
                backgroundColor={backgroundColor}
                onSelectColor={handleSelectBackgroundColor}
                hasBackgroundTemplate={!!background}
            />
        </div>
    );
}
