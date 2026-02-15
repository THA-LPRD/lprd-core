'use client';

import { ShadowPreview } from './shadow-preview';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';

type TemplateVariant = { type: 'content'; w: number; h: number } | { type: 'background' } | { type: 'foreground' };

function getPreviewSize(variant: TemplateVariant): { width: number; height: number } {
    if (variant.type === 'content') {
        return { width: variant.w * DEFAULT_CELL_SIZE, height: variant.h * DEFAULT_CELL_SIZE };
    }
    // Background/foreground = full display
    return { width: GRID_COLS * DEFAULT_CELL_SIZE, height: GRID_ROWS * DEFAULT_CELL_SIZE };
}

function getSizeLabel(variant: TemplateVariant): string {
    const { width, height } = getPreviewSize(variant);
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
    const { width, height } = getPreviewSize(activeVariant);

    return (
        <div className="flex flex-col items-center gap-3 p-4 h-full">
            <div className="flex-1 flex items-center justify-center w-full overflow-auto">
                <ShadowPreview templateHtml={templateHtml} sampleData={sampleData} width={width} height={height} />
            </div>
            <p className="text-xs text-muted-foreground">{getSizeLabel(activeVariant)}</p>
        </div>
    );
}
