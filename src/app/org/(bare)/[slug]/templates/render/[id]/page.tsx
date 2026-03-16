'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ShadowLayer } from '@/components/render/shadow-layer';
import { RenderPageShell } from '@/components/render/render-page-shell';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import type { Id } from '@convex/dataModel';
import type { TemplateVariant } from '@/lib/template';

function getVariantDimensions(variant: TemplateVariant): { widthCells: number; heightCells: number } {
    if (variant.type === 'content') {
        return { widthCells: variant.w, heightCells: variant.h };
    }
    return { widthCells: GRID_COLS, heightCells: GRID_ROWS };
}

export default function TemplateRenderPage() {
    const params = useParams<{ id: string }>();
    const bundle = useQuery(api.templates.crud.getRenderBundle, { templateId: params.id as Id<'templates'> });
    const [rendered, setRendered] = React.useState(false);

    if (!bundle) return null;

    const sampleData = (bundle.sampleData as Record<string, unknown>) ?? {};
    const preferred = (bundle.variants as TemplateVariant[])[bundle.preferredVariantIndex];
    const { widthCells, heightCells } = preferred
        ? getVariantDimensions(preferred)
        : { widthCells: GRID_COLS, heightCells: GRID_ROWS };

    return (
        <RenderPageShell rendered={rendered}>
            <ShadowLayer
                html={bundle.templateHtml}
                sampleData={sampleData}
                width={widthCells}
                height={heightCells}
                style={{ width: widthCells * DEFAULT_CELL_SIZE, height: heightCells * DEFAULT_CELL_SIZE }}
                onRendered={() => setRendered(true)}
            />
        </RenderPageShell>
    );
}
