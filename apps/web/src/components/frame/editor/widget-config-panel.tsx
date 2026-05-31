'use client';

import type { Id } from '@convex/dataModel';
import { GRID_COLS, GRID_ROWS } from '@shared/render/constants';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Trash2, X } from 'lucide-react';
import type { TemplateOption } from './template-picker';

type Widget = {
    id: string;
    templateId?: Id<'templates'>;
    variantIndex?: number;
    x: number;
    y: number;
    w: number;
    h: number;
};

export function WidgetConfigPanel({
    widget,
    templates,
    onUpdate,
    onRemove,
    onClose,
    onPickTemplate,
}: {
    widget: Widget;
    templates: TemplateOption[];
    onUpdate: (updates: Partial<Widget>) => void;
    onRemove: () => void;
    onClose: () => void;
    onPickTemplate: () => void;
}) {
    const assignedTemplate = widget.templateId ? templates.find((t) => t._id === widget.templateId) : undefined;

    return (
        <div className="w-64 border-l bg-background p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Widget Config</h3>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                    <X className="size-4" />
                </Button>
            </div>

            {/* Template assignment */}
            <div className="grid gap-2">
                <Label className="text-xs">Template</Label>
                {assignedTemplate ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm truncate flex-1">{assignedTemplate.name}</span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onUpdate({ templateId: undefined, variantIndex: undefined })}
                            className="shrink-0 size-5"
                        >
                            <X className="size-3" />
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={onPickTemplate} className="w-full">
                        Select Template
                    </Button>
                )}
            </div>

            {/* Position (read-only) */}
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                    <Label className="text-xs">X</Label>
                    <Input
                        type="number"
                        min={0}
                        max={GRID_COLS - widget.w}
                        value={widget.x}
                        onChange={(e) =>
                            onUpdate({ x: Math.max(0, Math.min(GRID_COLS - widget.w, Number(e.target.value))) })
                        }
                        className="h-8 text-sm"
                    />
                </div>
                <div className="grid gap-1">
                    <Label className="text-xs">Y</Label>
                    <Input
                        type="number"
                        min={0}
                        max={GRID_ROWS - widget.h}
                        value={widget.y}
                        onChange={(e) =>
                            onUpdate({ y: Math.max(0, Math.min(GRID_ROWS - widget.h, Number(e.target.value))) })
                        }
                        className="h-8 text-sm"
                    />
                </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                    <Label className="text-xs">Width</Label>
                    <Input
                        type="number"
                        min={1}
                        max={GRID_COLS - widget.x}
                        value={widget.w}
                        onChange={(e) =>
                            onUpdate({ w: Math.max(1, Math.min(GRID_COLS - widget.x, Number(e.target.value))) })
                        }
                        className="h-8 text-sm"
                    />
                </div>
                <div className="grid gap-1">
                    <Label className="text-xs">Height</Label>
                    <Input
                        type="number"
                        min={1}
                        max={GRID_ROWS - widget.y}
                        value={widget.h}
                        onChange={(e) =>
                            onUpdate({ h: Math.max(1, Math.min(GRID_ROWS - widget.y, Number(e.target.value))) })
                        }
                        className="h-8 text-sm"
                    />
                </div>
            </div>

            <div className="mt-auto pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={onRemove} className="w-full">
                    <Trash2 className="size-4 mr-2" />
                    Remove Widget
                </Button>
            </div>
        </div>
    );
}
