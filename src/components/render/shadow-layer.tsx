'use client';

import * as React from 'react';
import { getTemplateBaseCSS, renderAndSanitize } from '@/lib/render/template-document';
import { DEFAULT_CELL_SIZE } from '@/lib/render/constants';
import { resolveIconsInRoot } from '@/lib/render/icons';
import { resolveForRender } from '@/lib/template-data';

export function ShadowLayer({
    html,
    sampleData,
    cellSize = DEFAULT_CELL_SIZE,
    width,
    height,
    extraHostCSS,
    style,
    onRendered,
    errorFallback,
}: {
    html: string;
    sampleData: Record<string, unknown>;
    cellSize?: number;
    width?: number;
    height?: number;
    extraHostCSS?: string;
    style?: React.CSSProperties;
    onRendered?: () => void;
    errorFallback?: string | null;
}) {
    const hostRef = React.useRef<HTMLDivElement>(null);
    const shadowRef = React.useRef<ShadowRoot | null>(null);

    React.useEffect(() => {
        if (hostRef.current && !shadowRef.current) {
            shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
        }
    }, []);

    React.useEffect(() => {
        if (!shadowRef.current) return;

        const baseCSS = getTemplateBaseCSS(cellSize, width, height);
        const hostCSS = extraHostCSS ? `${baseCSS}; ${extraHostCSS}` : baseCSS;
        const baseStyles = `<style>:host { ${hostCSS} }</style>`;
        try {
            const resolvedData = resolveForRender(sampleData) as Record<string, unknown>;
            const rendered = renderAndSanitize(html, resolvedData, cellSize, width, height);
            shadowRef.current.innerHTML = baseStyles + rendered;
            resolveIconsInRoot(shadowRef.current);
            onRendered?.();
        } catch (error) {
            if (errorFallback === null) {
                shadowRef.current.innerHTML = '';
            } else if (errorFallback !== undefined) {
                shadowRef.current.innerHTML = baseStyles + errorFallback;
            } else {
                const message = error instanceof Error ? error.message : 'Unknown render error';
                shadowRef.current.innerHTML =
                    baseStyles +
                    `<div style="color: #ef4444; font-family: monospace; padding: 8px; font-size: 12px;">Template error: ${message}</div>`;
            }
        }
    }, [html, sampleData, cellSize, width, height, extraHostCSS, errorFallback, onRendered]);

    return <div ref={hostRef} style={style} />;
}
