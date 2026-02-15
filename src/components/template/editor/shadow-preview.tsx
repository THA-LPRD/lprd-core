'use client';

import { ShadowLayer } from '@/components/render/shadow-layer';

export function ShadowPreview({
    templateHtml,
    sampleData,
    width,
    height,
    widthCells,
    heightCells,
}: {
    templateHtml: string;
    sampleData: Record<string, unknown>;
    width: number;
    height: number;
    widthCells?: number;
    heightCells?: number;
}) {
    return (
        <div
            style={{
                width: `${width + 2}px`,
                height: `${height + 2}px`,
                pointerEvents: 'none',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'white',
            }}
        >
            <ShadowLayer
                html={templateHtml}
                sampleData={sampleData}
                width={widthCells}
                height={heightCells}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}
