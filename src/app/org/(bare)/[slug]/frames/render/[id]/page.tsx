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
    const frame = useQuery(api.frames.getById, { id: params.id as Id<'frames'> });

    // Collect all template IDs we need
    const templateIds = React.useMemo(() => {
        if (!frame) return [];
        const ids = new Set<string>();
        for (const w of frame.widgets) {
            if (w.templateId) ids.add(w.templateId);
        }
        if (frame.background) ids.add(frame.background.templateId);
        if (frame.foreground) ids.add(frame.foreground.templateId);
        return Array.from(ids);
    }, [frame]);

    // Fetch all templates for this org to get their HTML
    const templates = useQuery(
        api.templates.listByOrganization,
        frame ? { organizationId: frame.organizationId } : 'skip',
    );

    const templateMap = React.useMemo(() => {
        const map = new Map<string, { templateHtml: string; sampleData?: unknown }>();
        if (!templates) return map;
        for (const t of templates) {
            if (templateIds.includes(t._id)) {
                map.set(t._id, { templateHtml: t.templateHtml, sampleData: t.sampleData });
            }
        }
        return map;
    }, [templates, templateIds]);

    // Mark as rendered when frame and all templates are loaded
    const allLoaded = !!(frame && templates);

    if (!frame) return null;

    return (
        <RenderPageShell rendered={allLoaded}>
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
                        const doc = templateMap.get(frame.background.templateId);
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
                    const doc = templateMap.get(widget.templateId);
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
                        const doc = templateMap.get(frame.foreground.templateId);
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
