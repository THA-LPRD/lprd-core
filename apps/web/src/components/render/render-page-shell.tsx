'use client';

import * as React from 'react';
import { useHideDevIndicator } from '@/lib/hooks/use-hide-dev-indicator';

export function RenderPageShell({ children, rendered }: { children: React.ReactNode; rendered: boolean }) {
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    useHideDevIndicator();

    React.useEffect(() => {
        const body = document.body;
        if (rendered && wrapperRef.current && body) {
            wrapperRef.current.setAttribute('data-rendered', '');
            body.setAttribute('data-rendered', '');
        } else if (body) {
            body.removeAttribute('data-rendered');
        }
    }, [rendered]);

    return (
        <>
            <style>
                {'body { margin: 0; background: white; } next-dev-tools-indicator { display: none !important; }'}
            </style>
            <div ref={wrapperRef}>{children}</div>
        </>
    );
}
