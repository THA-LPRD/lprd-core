'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export function TemplatePicker({
    open,
    onOpenChange,
    templates,
    filter,
    onSelect,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: TemplateOption[];
    filter: (variant: TemplateVariant, index: number) => boolean;
    onSelect: (selection: TemplateSelection) => void;
}) {
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Template</DialogTitle>
                    <DialogDescription>Choose a template to use.</DialogDescription>
                </DialogHeader>

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
            </DialogContent>
        </Dialog>
    );
}

/**
 * Inline display of a selected template, with a clear button.
 */
export function TemplatePickerInline({
    label,
    templateName,
    onPick,
    onClear,
}: {
    label: string;
    templateName?: string;
    onPick: () => void;
    onClear: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{label}</span>
            {templateName ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <button type="button" onClick={onPick} className="text-sm truncate hover:underline text-left">
                        {templateName}
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
