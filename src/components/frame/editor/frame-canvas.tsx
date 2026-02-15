'use client';

import * as React from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import { ShadowLayer } from '@/components/render/shadow-layer';
import type { Id } from '@convex/dataModel';

type TemplateVariant = { type: 'content'; w: number; h: number } | { type: 'background' } | { type: 'foreground' };

type TemplateDoc = {
    _id: Id<'templates'>;
    templateHtml: string;
    sampleData?: unknown;
    variants: TemplateVariant[];
};

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

const CANVAS_W = GRID_COLS * DEFAULT_CELL_SIZE;
const CANVAS_H = GRID_ROWS * DEFAULT_CELL_SIZE;

function DraggableWidget({
    widget,
    isSelected,
    onClick,
    templateDoc,
}: {
    widget: Widget;
    isSelected: boolean;
    onClick: () => void;
    templateDoc: TemplateDoc | null;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: widget.id,
    });

    const style: React.CSSProperties = {
        position: 'absolute',
        left: widget.x * DEFAULT_CELL_SIZE + (transform?.x ?? 0),
        top: widget.y * DEFAULT_CELL_SIZE + (transform?.y ?? 0),
        width: widget.w * DEFAULT_CELL_SIZE,
        height: widget.h * DEFAULT_CELL_SIZE,
        cursor: 'grab',
        outline: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
        outlineOffset: -1,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'white',
        zIndex: isSelected ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            {...listeners}
            {...attributes}
        >
            {templateDoc ? (
                <ShadowLayer
                    html={templateDoc.templateHtml}
                    sampleData={(templateDoc.sampleData as Record<string, unknown>) ?? {}}
                    extraHostCSS="overflow: hidden;"
                    style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                    errorFallback={`<div style="color:#ef4444;font-family:monospace;padding:8px;font-size:12px;">Render error</div>`}
                />
            ) : (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        color: '#a1a1aa',
                        fontSize: 12,
                        fontFamily: 'sans-serif',
                        pointerEvents: 'none',
                    }}
                >
                    No template
                </div>
            )}
        </div>
    );
}

function LayerPreview({ templateDoc }: { templateDoc: TemplateDoc | undefined }) {
    if (!templateDoc) return null;

    const sampleData = (templateDoc.sampleData as Record<string, unknown>) ?? {};

    return (
        <ShadowLayer
            html={templateDoc.templateHtml}
            sampleData={sampleData}
            extraHostCSS="overflow: hidden;"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            errorFallback={null}
        />
    );
}

export function FrameCanvas({
    widgets,
    selectedWidgetId,
    onSelectWidget,
    onMoveWidget,
    background,
    foreground,
    templateDocs,
}: {
    widgets: Widget[];
    selectedWidgetId: string | null;
    onSelectWidget: (id: string | null) => void;
    onMoveWidget: (id: string, x: number, y: number) => void;
    background?: LayerRef;
    foreground?: LayerRef;
    templateDocs: Map<string, TemplateDoc>;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        const widget = widgets.find((w) => w.id === active.id);
        if (!widget) return;

        const dx = Math.round(delta.x / DEFAULT_CELL_SIZE);
        const dy = Math.round(delta.y / DEFAULT_CELL_SIZE);
        const newX = Math.max(0, Math.min(GRID_COLS - widget.w, widget.x + dx));
        const newY = Math.max(0, Math.min(GRID_ROWS - widget.h, widget.y + dy));

        // Collision detection: check if new position overlaps any other widget
        const overlaps = widgets.some(
            (other) =>
                other.id !== widget.id &&
                newX < other.x + other.w &&
                newX + widget.w > other.x &&
                newY < other.y + other.h &&
                newY + widget.h > other.y,
        );

        if (!overlaps) {
            onMoveWidget(widget.id, newX, newY);
        }
    };

    const bgDoc = background ? templateDocs.get(background.templateId) : undefined;
    const fgDoc = foreground ? templateDocs.get(foreground.templateId) : undefined;

    return (
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-8">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div
                    style={{
                        position: 'relative',
                        width: CANVAS_W,
                        height: CANVAS_H,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    onClick={() => onSelectWidget(null)}
                >
                    {/* Grid lines */}
                    <svg
                        width={CANVAS_W}
                        height={CANVAS_H}
                        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
                    >
                        {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
                            <line
                                key={`v${i}`}
                                x1={i * DEFAULT_CELL_SIZE}
                                y1={0}
                                x2={i * DEFAULT_CELL_SIZE}
                                y2={CANVAS_H}
                                stroke="var(--border)"
                                strokeWidth={0.5}
                                strokeDasharray="4 4"
                                opacity={0.5}
                            />
                        ))}
                        {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
                            <line
                                key={`h${i}`}
                                x1={0}
                                y1={i * DEFAULT_CELL_SIZE}
                                x2={CANVAS_W}
                                y2={i * DEFAULT_CELL_SIZE}
                                stroke="var(--border)"
                                strokeWidth={0.5}
                                strokeDasharray="4 4"
                                opacity={0.5}
                            />
                        ))}
                    </svg>

                    {/* Background layer */}
                    {bgDoc && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                            <LayerPreview templateDoc={bgDoc} />
                        </div>
                    )}

                    {/* Widgets */}
                    {widgets.map((widget) => (
                        <DraggableWidget
                            key={widget.id}
                            widget={widget}
                            isSelected={widget.id === selectedWidgetId}
                            onClick={() => onSelectWidget(widget.id)}
                            templateDoc={widget.templateId ? (templateDocs.get(widget.templateId) ?? null) : null}
                        />
                    ))}

                    {/* Foreground layer */}
                    {fgDoc && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
                            <LayerPreview templateDoc={fgDoc} />
                        </div>
                    )}
                </div>
            </DndContext>
        </div>
    );
}
