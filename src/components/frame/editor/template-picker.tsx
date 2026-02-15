'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    ColorPicker,
    ColorPickerAlphaSlider,
    ColorPickerArea,
    ColorPickerContent,
    ColorPickerEyeDropper,
    ColorPickerFormatSelect,
    ColorPickerHueSlider,
    ColorPickerInput,
} from '@/components/ui/color-picker';
import { LayoutTemplate, X } from 'lucide-react';
import type { Id } from '@convex/dataModel';

type TemplateVariant = { type: 'content'; w: number; h: number } | { type: 'background' } | { type: 'foreground' };

export type TemplateOption = {
    _id: Id<'templates'>;
    name: string;
    thumbnailUrl: string | null;
    variants: TemplateVariant[];
};

export type TemplateSelection = {
    templateId: Id<'templates'>;
    variantIndex: number;
};

const BG_COLOR_PRESETS = [
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
    { label: 'Slate', value: '#64748b' },
    { label: 'Gray', value: '#9ca3af' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Amber', value: '#f59e0b' },
    { label: 'Green', value: '#22c55e' },
    { label: 'Teal', value: '#14b8a6' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Indigo', value: '#6366f1' },
    { label: 'Purple', value: '#a855f7' },
];

type BackgroundTab = 'color' | 'template';

export function TemplatePicker({
    open,
    onOpenChange,
    templates,
    filter,
    onSelect,
    mode = 'default',
    backgroundColor,
    onSelectColor,
    hasBackgroundTemplate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: TemplateOption[];
    filter: (variant: TemplateVariant, index: number) => boolean;
    onSelect: (selection: TemplateSelection) => void;
    mode?: 'default' | 'background';
    backgroundColor?: string;
    onSelectColor?: (color: string) => void;
    hasBackgroundTemplate?: boolean;
}) {
    const [activeTab, setActiveTab] = React.useState<BackgroundTab>(() =>
        hasBackgroundTemplate ? 'template' : 'color',
    );
    const [draftColor, setDraftColor] = React.useState(backgroundColor ?? '#ffffff');

    // Reset tab and draft color when dialog opens
    React.useEffect(() => {
        if (open) {
            setActiveTab(hasBackgroundTemplate ? 'template' : 'color');
            setDraftColor(backgroundColor ?? '#ffffff');
        }
    }, [open, hasBackgroundTemplate, backgroundColor]);

    // Build list of matching template+variant pairs
    const options = React.useMemo(() => {
        const result: { template: TemplateOption; variantIndex: number; variant: TemplateVariant }[] = [];
        for (const template of templates) {
            for (let i = 0; i < template.variants.length; i++) {
                if (filter(template.variants[i], i)) {
                    result.push({ template, variantIndex: i, variant: template.variants[i] });
                }
            }
        }
        return result;
    }, [templates, filter]);

    const templateGrid = (
        <>
            {options.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No matching templates available.</p>
            ) : (
                <div className="grid gap-2 py-2">
                    {options.map((opt) => {
                        const variantLabel =
                            opt.variant.type === 'content'
                                ? `${opt.variant.w}×${opt.variant.h}`
                                : opt.variant.type === 'background'
                                  ? 'BG'
                                  : 'FG';
                        return (
                            <button
                                key={`${opt.template._id}-${opt.variantIndex}`}
                                type="button"
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left w-full transition-colors"
                                onClick={() => {
                                    onSelect({
                                        templateId: opt.template._id,
                                        variantIndex: opt.variantIndex,
                                    });
                                    onOpenChange(false);
                                }}
                            >
                                <div className="w-12 h-8 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                    {opt.template.thumbnailUrl ? (
                                        <Image
                                            src={opt.template.thumbnailUrl}
                                            alt={opt.template.name}
                                            width={48}
                                            height={32}
                                            className="object-contain"
                                            unoptimized
                                        />
                                    ) : (
                                        <LayoutTemplate className="size-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{opt.template.name}</p>
                                    <p className="text-xs text-muted-foreground">{variantLabel}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );

    if (mode === 'default') {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Select Template</DialogTitle>
                        <DialogDescription>Choose a template to use.</DialogDescription>
                    </DialogHeader>
                    {templateGrid}
                </DialogContent>
            </Dialog>
        );
    }

    // Background mode with Color / Template tabs
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Background</DialogTitle>
                    <DialogDescription>Choose a solid color or a template.</DialogDescription>
                </DialogHeader>

                {/* Tab buttons */}
                <div className="flex gap-1 border-b">
                    <button
                        type="button"
                        className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === 'color'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setActiveTab('color')}
                    >
                        Color
                    </button>
                    <button
                        type="button"
                        className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === 'template'
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setActiveTab('template')}
                    >
                        Template
                    </button>
                </div>

                {activeTab === 'color' ? (
                    <div className="flex flex-col gap-4 py-2">
                        {/* Preset swatches */}
                        <div className="grid grid-cols-6 gap-2 justify-items-center">
                            {BG_COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    title={preset.label}
                                    className="size-8 rounded-full border-2 border-muted hover:scale-110 transition-transform"
                                    style={{ backgroundColor: preset.value }}
                                    onClick={() => setDraftColor(preset.value)}
                                />
                            ))}
                        </div>

                        {/* Full color picker */}
                        <ColorPicker inline value={draftColor} onValueChange={setDraftColor}>
                            <ColorPickerContent className="w-full">
                                <ColorPickerArea />
                                <ColorPickerHueSlider />
                                <ColorPickerAlphaSlider />
                                <div className="flex items-center gap-2">
                                    <ColorPickerEyeDropper />
                                    <ColorPickerFormatSelect />
                                    <ColorPickerInput className="flex-1 min-w-0" />
                                </div>
                            </ColorPickerContent>
                        </ColorPicker>

                        <Button
                            onClick={() => {
                                onSelectColor?.(draftColor);
                                onOpenChange(false);
                            }}
                        >
                            Apply
                        </Button>
                    </div>
                ) : (
                    templateGrid
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Inline display of a selected template or color, with a clear button.
 */
export function TemplatePickerInline({
    label,
    templateName,
    backgroundColor,
    onPick,
    onClear,
}: {
    label: string;
    templateName?: string;
    backgroundColor?: string;
    onPick: () => void;
    onClear: () => void;
}) {
    const hasSelection = templateName || backgroundColor;

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{label}</span>
            {hasSelection ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <button
                        type="button"
                        onClick={onPick}
                        className="flex items-center gap-1.5 text-sm truncate hover:underline text-left"
                    >
                        {backgroundColor && !templateName && (
                            <span
                                className="inline-block size-3.5 rounded-sm border shrink-0"
                                style={{ backgroundColor }}
                            />
                        )}
                        <span className="truncate">{templateName ?? backgroundColor}</span>
                    </button>
                    <Button variant="ghost" size="icon-sm" onClick={onClear} className="shrink-0 size-5">
                        <X className="size-3" />
                    </Button>
                </div>
            ) : (
                <Button variant="outline" size="sm" onClick={onPick} className="text-xs h-7">
                    Select
                </Button>
            )}
        </div>
    );
}
