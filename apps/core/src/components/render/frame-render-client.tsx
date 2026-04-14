'use client';

import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@shared/render/constants';
import { RenderPageShell } from '@/components/render/render-page-shell';
import { ShadowLayer } from '@/components/render/shadow-layer';
import { useRenderReadiness } from '@/components/render/use-render-readiness';

const CANVAS_W = GRID_COLS * DEFAULT_CELL_SIZE;
const CANVAS_H = GRID_ROWS * DEFAULT_CELL_SIZE;

export function FrameRenderClient({
    bundle,
}: {
    bundle: {
        frame: {
            widgets: Array<{ id: string; x: number; y: number; w: number; h: number; templateId?: string }>;
            background?: { templateId: string };
            foreground?: { templateId: string };
            backgroundColor?: string;
        };
        templates: Record<string, { templateHtml: string; sampleData?: unknown }>;
    };
}) {
    const { frame, templates } = bundle;
    const layerKeys = [
        ...(frame.background && templates[frame.background.templateId] ? ['background'] : []),
        ...frame.widgets
            .filter((widget) => widget.templateId && templates[widget.templateId])
            .map((widget) => `widget:${widget.id}`),
        ...(frame.foreground && templates[frame.foreground.templateId] ? ['foreground'] : []),
    ];
    const { rendered, markLayerRendered } = useRenderReadiness(layerKeys);

    return (
        <RenderPageShell rendered={rendered}>
            <div
                data-render-target
                style={{
                    position: 'relative',
                    width: CANVAS_W,
                    height: CANVAS_H,
                    overflow: 'hidden',
                    background: 'white',
                }}
            >
                {frame.background ? (
                    (() => {
                        const background = frame.background;
                        const doc = templates[background.templateId];
                        if (!doc) return null;
                        return (
                            <ShadowLayer
                                html={doc.templateHtml}
                                sampleData={(doc.sampleData as Record<string, unknown>) ?? {}}
                                width={GRID_COLS}
                                height={GRID_ROWS}
                                extraHostCSS="overflow: hidden;"
                                style={{ position: 'absolute', inset: 0, zIndex: 0 }}
                                onRendered={() => markLayerRendered('background')}
                                errorFallback={null}
                            />
                        );
                    })()
                ) : frame.backgroundColor ? (
                    <div
                        style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundColor: frame.backgroundColor }}
                    />
                ) : null}

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
                            onRendered={() => markLayerRendered(`widget:${widget.id}`)}
                            errorFallback={null}
                        />
                    );
                })}

                {frame.foreground
                    ? (() => {
                          const foreground = frame.foreground;
                          const doc = templates[foreground.templateId];
                          if (!doc) return null;
                          return (
                              <ShadowLayer
                                  html={doc.templateHtml}
                                  sampleData={(doc.sampleData as Record<string, unknown>) ?? {}}
                                  width={GRID_COLS}
                                  height={GRID_ROWS}
                                  extraHostCSS="overflow: hidden;"
                                  style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}
                                  onRendered={() => markLayerRendered('foreground')}
                                  errorFallback={null}
                              />
                          );
                      })()
                    : null}
            </div>
        </RenderPageShell>
    );
}
