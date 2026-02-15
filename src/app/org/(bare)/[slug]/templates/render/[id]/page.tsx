'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ShadowLayer } from '@/components/render/shadow-layer';
import { RenderPageShell } from '@/components/render/render-page-shell';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import type { Id } from '@convex/dataModel';

type TemplateVariant = { type: 'content'; w: number; h: number } | { type: 'background' } | { type: 'foreground' };

function getVariantSize(variant: TemplateVariant): { width: number; height: number } {
    if (variant.type === 'content') {
        return { width: variant.w * DEFAULT_CELL_SIZE, height: variant.h * DEFAULT_CELL_SIZE };
    }
    return { width: GRID_COLS * DEFAULT_CELL_SIZE, height: GRID_ROWS * DEFAULT_CELL_SIZE };
}

export default function TemplateRenderPage() {
    const params = useParams<{ id: string }>();
    const template = useQuery(api.templates.getById, { id: params.id as Id<'templates'> });
    const [rendered, setRendered] = React.useState(false);

    if (!template) return null;

    const sampleData = (template.sampleData as Record<string, unknown>) ?? {};
    const preferred = (template.variants as TemplateVariant[])[template.preferredVariantIndex];
    const { width, height } = preferred
        ? getVariantSize(preferred)
        : { width: GRID_COLS * DEFAULT_CELL_SIZE, height: GRID_ROWS * DEFAULT_CELL_SIZE };

    return (
        <RenderPageShell rendered={rendered}>
            <ShadowLayer
                html={template.templateHtml}
                sampleData={sampleData}
                style={{ width, height }}
                onRendered={() => setRendered(true)}
            />
        </RenderPageShell>
    );
}
