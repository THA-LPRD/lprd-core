'use client';

import { ShadowLayer } from '@/components/render/shadow-layer';
import { RenderPageShell } from '@/components/render/render-page-shell';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import type { TemplateVariant } from '@/lib/template';

function getVariantDimensions(variant: TemplateVariant): { widthCells: number; heightCells: number } {
    if (variant.type === 'content') {
        return { widthCells: variant.w, heightCells: variant.h };
    }
    return { widthCells: GRID_COLS, heightCells: GRID_ROWS };
}

export function TemplateRenderClient({
    bundle,
}: {
    bundle: {
        templateHtml: string;
        sampleData: unknown;
        variants: TemplateVariant[];
        preferredVariantIndex: number;
    };
}) {
    const sampleData = (bundle.sampleData as Record<string, unknown>) ?? {};
    const preferred = bundle.variants[bundle.preferredVariantIndex];
    const { widthCells, heightCells } = preferred
        ? getVariantDimensions(preferred)
        : { widthCells: GRID_COLS, heightCells: GRID_ROWS };

    return (
        <RenderPageShell rendered>
            <ShadowLayer
                html={bundle.templateHtml}
                sampleData={sampleData}
                width={widthCells}
                height={heightCells}
                style={{ width: widthCells * DEFAULT_CELL_SIZE, height: heightCells * DEFAULT_CELL_SIZE }}
            />
        </RenderPageShell>
    );
}
