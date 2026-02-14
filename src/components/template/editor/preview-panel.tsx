'use client';

import { ShadowPreview } from './shadow-preview';

type TemplateVariant = { type: 'content'; w: number; h: number } | { type: 'background' } | { type: 'foreground' };

const CELL_SIZE = 120;
const FULL_W = 6;
const FULL_H = 4;

function getPreviewSize(variant: TemplateVariant): { width: number; height: number } {
    if (variant.type === 'content') {
        return { width: variant.w * CELL_SIZE, height: variant.h * CELL_SIZE };
    }
    // Background/foreground = full display
    return { width: FULL_W * CELL_SIZE, height: FULL_H * CELL_SIZE };
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
