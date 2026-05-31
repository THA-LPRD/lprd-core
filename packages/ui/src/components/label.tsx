'use client';

import type * as React from 'react';

import { cn } from '../lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
    return (
        // shadcn label forwards htmlFor/control props through the component API.
        // oxlint-disable-next-line
        <label
            data-slot="label"
            className={cn(
                'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

export { Label };
