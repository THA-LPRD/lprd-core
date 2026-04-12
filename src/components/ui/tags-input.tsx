'use client';

import * as TagsInputPrimitive from '@diceui/tags-input';
import { X } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

function TagsInput({ className, ...props }: React.ComponentProps<typeof TagsInputPrimitive.Root>) {
    return (
        <TagsInputPrimitive.Root
            data-slot="tags-input"
            className={cn('flex w-full flex-col gap-2', className)}
            {...props}
        />
    );
}

function TagsInputLabel({ className, ...props }: React.ComponentProps<typeof TagsInputPrimitive.Label>) {
    return (
        <TagsInputPrimitive.Label
            data-slot="tags-input-label"
            className={cn(
                'font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                className,
            )}
            {...props}
        />
    );
}

function TagsInputList({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="tags-input-list"
            className={cn(
                'dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors focus-within:ring-[3px] aria-invalid:ring-[3px] md:text-sm',
                className,
            )}
            {...props}
        />
    );
}

function TagsInputInput({ className, ...props }: React.ComponentProps<typeof TagsInputPrimitive.Input>) {
    return (
        <TagsInputPrimitive.Input
            data-slot="tags-input-input"
            className={cn(
                'h-6 min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

function TagsInputItem({ className, children, ...props }: React.ComponentProps<typeof TagsInputPrimitive.Item>) {
    return (
        <TagsInputPrimitive.Item
            data-slot="tags-input-item"
            className={cn(
                'inline-flex h-5 max-w-[calc(100%-8px)] items-center gap-1 rounded-4xl border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors focus:outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-editable:select-none data-editing:bg-transparent data-editing:ring-[3px] data-editing:ring-ring/50 [&:not([data-editing])]:pr-1 [&[data-highlighted]:not([data-editing])]:bg-accent [&[data-highlighted]:not([data-editing])]:text-accent-foreground',
                className,
            )}
            {...props}
        >
            <TagsInputPrimitive.ItemText className="truncate">{children}</TagsInputPrimitive.ItemText>
            <TagsInputPrimitive.ItemDelete
                type="button"
                aria-label="Remove tag"
                className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                <X className="size-3" />
            </TagsInputPrimitive.ItemDelete>
        </TagsInputPrimitive.Item>
    );
}

function TagsInputClear({ ...props }: React.ComponentProps<typeof TagsInputPrimitive.Clear>) {
    return <TagsInputPrimitive.Clear data-slot="tags-input-clear" {...props} />;
}

export { TagsInput, TagsInputClear, TagsInputInput, TagsInputItem, TagsInputLabel, TagsInputList };
