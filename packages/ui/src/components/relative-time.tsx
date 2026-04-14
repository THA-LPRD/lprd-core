'use client';

import * as React from 'react';

export function RelativeTime({ timestamp }: { timestamp: number }) {
    const [now] = React.useState(() => Date.now());
    const diff = now - timestamp;
    let label: string;
    if (diff < 60_000) label = 'just now';
    else if (diff < 3_600_000) label = `${Math.floor(diff / 60_000)}m ago`;
    else if (diff < 86_400_000) label = `${Math.floor(diff / 3_600_000)}h ago`;
    else label = `${Math.floor(diff / 86_400_000)}d ago`;

    return (
        <span
            title={new Date(timestamp).toLocaleString()}
            className="cursor-default text-xs text-muted-foreground tabular-nums"
        >
            {label}
        </span>
    );
}
