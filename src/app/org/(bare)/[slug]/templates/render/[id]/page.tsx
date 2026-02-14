'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { renderAndSanitize, TEMPLATE_BASE_CSS } from '@/lib/template-document';
import type { Id } from '@convex/dataModel';

export default function TemplateRenderPage() {
    const params = useParams<{ id: string }>();
    const template = useQuery(api.templates.getById, { id: params.id as Id<'templates'> });
    const hostRef = React.useRef<HTMLDivElement>(null);
    const shadowRef = React.useRef<ShadowRoot | null>(null);

    React.useEffect(() => {
        if (hostRef.current && !shadowRef.current) {
            shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
        }
    }, []);

    // Hide Next.js dev indicator
    React.useEffect(() => {
        const hideIndicator = () => {
            const indicator = document.querySelector('nextjs-portal');
            if (indicator) {
                (indicator as HTMLElement).style.display = 'none';
            }
        };

        hideIndicator();
        const interval = setInterval(hideIndicator, 100);

        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        if (!shadowRef.current || !template) return;

        const baseStyles = `<style>:host { ${TEMPLATE_BASE_CSS} }</style>`;
        const sampleData = (template.sampleData as Record<string, unknown>) ?? {};
        try {
            const html = renderAndSanitize(template.templateHtml, sampleData);
            shadowRef.current.innerHTML = baseStyles + html;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown render error';
            shadowRef.current.innerHTML =
                baseStyles +
                `<div style="color: #ef4444; font-family: monospace; padding: 8px; font-size: 12px;">Template error: ${message}</div>`;
        }

        hostRef.current?.setAttribute('data-rendered', '');
    }, [template]);

    return (
        <>
            <style>
                {'body { margin: 0; background: white; } next-dev-tools-indicator { display: none !important; }'}
            </style>
            <div ref={hostRef} style={{ width: '100vw', height: '100vh' }} />
        </>
    );
}
