'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ShadowLayer } from '@/components/render/shadow-layer';
import { RenderPageShell } from '@/components/render/render-page-shell';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import type { Id } from '@convex/dataModel';

const CANVAS_W = GRID_COLS * DEFAULT_CELL_SIZE;
const CANVAS_H = GRID_ROWS * DEFAULT_CELL_SIZE;

export default function FrameRenderPage() {
    const params = useParams<{ id: string }>();
    const bundle = useQuery(api.frames.getRenderBundle, { frameId: params.id as Id<'frames'> });

    if (!bundle) return null;

    const { frame, templates } = bundle;

    return (
        <RenderPageShell rendered>
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
                    return (
                        <ShadowLayer
                            key={widget.id}
                            html={doc.templateHtml}
                            sampleData={(doc.sampleData as Record<string, unknown>) ?? {}}
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
