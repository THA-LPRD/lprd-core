'use client';

import * as React from 'react';
import { renderAndSanitize, TEMPLATE_BASE_CSS } from '@/lib/template-document';

export function ShadowPreview({
    templateHtml,
    sampleData,
    width,
    height,
}: {
    templateHtml: string;
    sampleData: Record<string, unknown>;
    width: number;
    height: number;
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

        const baseStyles = `<style>:host { ${TEMPLATE_BASE_CSS} }</style>`;
        try {
            const sanitized = renderAndSanitize(templateHtml, sampleData);
            shadowRef.current.innerHTML = baseStyles + sanitized;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown render error';
            shadowRef.current.innerHTML =
                baseStyles +
                `<div style="color: #ef4444; font-family: monospace; padding: 8px; font-size: 12px;">Template error: ${message}</div>`;
        }
    }, [templateHtml, sampleData]);

    return (
        <div
            ref={hostRef}
            style={{
                width: `${width + 2}px`,
                height: `${height + 2}px`,
                pointerEvents: 'none',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'white',
            }}
        />
    );
}
