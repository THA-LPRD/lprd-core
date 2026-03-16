'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ShadowLayer } from '@/components/render/shadow-layer';
import { RenderPageShell } from '@/components/render/render-page-shell';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import { resolveForRender } from '@/lib/template-data';
import type { Id } from '@convex/dataModel';

const CANVAS_W = GRID_COLS * DEFAULT_CELL_SIZE;
const CANVAS_H = GRID_ROWS * DEFAULT_CELL_SIZE;

export default function DeviceRenderPage() {
    const params = useParams<{ id: string }>();
    const bundle = useQuery(api.devices.render.getRenderBundle, { deviceId: params.id as Id<'devices'> });

    const getWidgetData = React.useCallback(
        (widgetId: string, sampleData?: unknown): Record<string, unknown> => {
            const base = resolveForRender(sampleData ?? {}) as Record<string, unknown>;

            const bound = bundle?.bindingData[widgetId];
            if (!bound) return base;

            const resolvedBound = resolveForRender(bound) as Record<string, unknown>;
            return { ...base, ...resolvedBound };
        },
        [bundle?.bindingData],
    );

    if (!bundle) return null;

    const { frame, templates } = bundle;

    return (
        <RenderPageShell rendered={!!bundle}>
            <div
                style={{
                    position: 'relative',
                    width: CANVAS_W,
                    height: CANVAS_H,
                    overflow: 'hidden',
                    background: 'white',
                }}
            >
                {/* Background layer */}
                {frame.background ? (
                    (() => {
                        const doc = templates[frame.background.templateId];
                        if (!doc) return null;
                        return (
                            <ShadowLayer
                                html={doc.templateHtml}
                                sampleData={(doc.sampleData as Record<string, unknown>) ?? {}}
                                width={GRID_COLS}
                                height={GRID_ROWS}
                                extraHostCSS="overflow: hidden;"
                                style={{ position: 'absolute', inset: 0, zIndex: 0 }}
                                errorFallback={null}
                            />
                        );
                    })()
                ) : frame.backgroundColor ? (
                    <div
                        style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundColor: frame.backgroundColor }}
                    />
                ) : null}

                {/* Content widgets */}
                {frame.widgets.map((widget) => {
                    if (!widget.templateId) return null;
                    const doc = templates[widget.templateId];
                    if (!doc) return null;
                    const data = getWidgetData(widget.id, doc.sampleData);
                    return (
                        <ShadowLayer
                            key={widget.id}
                            html={doc.templateHtml}
                            sampleData={data}
                            width={widget.w}
                            height={widget.h}
                            extraHostCSS="overflow: hidden;"
                            style={{
                                position: 'absolute',
                                left: widget.x * DEFAULT_CELL_SIZE,
                                top: widget.y * DEFAULT_CELL_SIZE,
                                width: widget.w * DEFAULT_CELL_SIZE,
                                height: widget.h * DEFAULT_CELL_SIZE,
                                zIndex: 1,
                                overflow: 'hidden',
                            }}
                            errorFallback={null}
                        />
                    );
                })}

                {/* Foreground layer */}
                {frame.foreground &&
                    (() => {
                        const doc = templates[frame.foreground.templateId];
                        if (!doc) return null;
                        return (
                            <ShadowLayer
                                html={doc.templateHtml}
                                sampleData={(doc.sampleData as Record<string, unknown>) ?? {}}
                                width={GRID_COLS}
                                height={GRID_ROWS}
                                extraHostCSS="overflow: hidden;"
                                style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}
                                errorFallback={null}
                            />
                        );
                    })()}
            </div>
        </RenderPageShell>
    );
}
