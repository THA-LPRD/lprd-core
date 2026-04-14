'use client';

import { ShadowPreview } from './shadow-preview';
import { ScrollArea, ScrollBar } from '@workspace/ui/components/scroll-area';
import { getVariantPixelSize, GRID_COLS, GRID_ROWS } from '@shared/render/constants';

import type { TemplateVariant } from '@shared/template';

function getVariantCells(variant: TemplateVariant): { widthCells: number; heightCells: number } {
    if (variant.type === 'content') {
        return { widthCells: variant.w, heightCells: variant.h };
    }
    return { widthCells: GRID_COLS, heightCells: GRID_ROWS };
}

function getSizeLabel(variant: TemplateVariant): string {
    const { width, height } = getVariantPixelSize(variant);
    if (variant.type === 'content') {
        return `${variant.w}×${variant.h} (${width} × ${height} px)`;
    }
    if (variant.type === 'background') {
        return `Background (${width} × ${height} px)`;
    }
    return `Foreground (${width} × ${height} px)`;
}

export function PreviewPanel({
    templateHtml,
    sampleData,
    activeVariant,
}: {
    templateHtml: string;
    sampleData: Record<string, unknown>;
    activeVariant: TemplateVariant;
}) {
    const { widthCells, heightCells } = getVariantCells(activeVariant);
    const { width, height } = getVariantPixelSize(activeVariant);

    return (
        <div className="flex flex-col items-center gap-3 p-4 h-full">
            <ScrollArea className="flex-1 min-h-0 w-full">
                <div
                    style={{
                        minWidth: width + 32,
                        minHeight: height + 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <ShadowPreview
                        templateHtml={templateHtml}
                        sampleData={sampleData}
                        width={width}
                        height={height}
                        widthCells={widthCells}
                        heightCells={heightCells}
                    />
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <p className="text-xs text-muted-foreground">{getSizeLabel(activeVariant)}</p>
        </div>
    );
}
