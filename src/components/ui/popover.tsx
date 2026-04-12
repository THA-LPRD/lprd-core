'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as React from 'react';

import { useComposedRefs } from '@/lib/compose-refs';
import { cn } from '@/lib/utils';

// Context used by PopoverAnchor and PopoverContent to share positioning state.
type PopoverContextValue = {
    anchorRef: React.RefObject<Element | null>;
    interactOutsideRef: React.MutableRefObject<((event: Event) => void) | undefined>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function Popover({ onOpenChange, ...props }: PopoverPrimitive.Root.Props) {
    const anchorRef = React.useRef<Element | null>(null);
    const interactOutsideRef = React.useRef<((event: Event) => void) | undefined>(undefined);

    const handleOpenChange = React.useCallback<NonNullable<PopoverPrimitive.Root.Props['onOpenChange']>>(
        (open, eventDetails) => {
            if (!open && eventDetails.reason === 'outside-press' && interactOutsideRef.current) {
                const nativeEvent = eventDetails.event;
                let defaultPrevented = false;
                const wrappedEvent = {
                    target: nativeEvent.target,
                    currentTarget: nativeEvent.currentTarget ?? null,
                    defaultPrevented: false,
                    preventDefault() {
                        defaultPrevented = true;
                        (this as { defaultPrevented: boolean }).defaultPrevented = true;
                    },
                } as unknown as Event;
                interactOutsideRef.current(wrappedEvent);
                if (defaultPrevented) {
                    eventDetails.cancel();
                    return;
                }
            }
            onOpenChange?.(open, eventDetails);
        },
        [onOpenChange],
    );

    const contextValue = React.useMemo<PopoverContextValue>(() => ({ anchorRef, interactOutsideRef }), []);

    return (
        <PopoverContext.Provider value={contextValue}>
            <PopoverPrimitive.Root data-slot="popover" onOpenChange={handleOpenChange} {...props} />
        </PopoverContext.Provider>
    );
}

/** Marks a child element as the positioning anchor for the popover. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PopoverAnchor({ children }: { children: React.ReactElement<any>; asChild?: boolean }) {
    const ctx = React.useContext(PopoverContext);
    const childRef = children.props.ref as React.Ref<Element> | undefined;
    const composedRef = useComposedRefs(childRef, ctx?.anchorRef);

    if (!ctx) return children;
    return React.cloneElement(children, { ref: composedRef });
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

interface PopoverContentProps extends React.ComponentProps<'div'> {
    align?: PopoverPrimitive.Positioner.Props['align'];
    alignOffset?: number;
    side?: PopoverPrimitive.Positioner.Props['side'];
    sideOffset?: number;
    /** Called when the popover gains focus on open. Mirrors Radix's onOpenAutoFocus. */
    onOpenAutoFocus?: (event: Event) => void;
    /** Called when a pointer-down happens outside the popover. Mirrors Radix's onInteractOutside. */
    onInteractOutside?: (event: Event) => void;
}

function PopoverPopupInner({
    onOpenAutoFocus,
    className,
    ...props
}: React.ComponentProps<'div'> & { onOpenAutoFocus?: (event: Event) => void }) {
    React.useLayoutEffect(() => {
        if (!onOpenAutoFocus) return;
        let defaultPrevented = false;
        const syntheticEvent = {
            defaultPrevented: false,
            preventDefault() {
                defaultPrevented = true;
                (this as { defaultPrevented: boolean }).defaultPrevented = true;
            },
        } as Event;
        onOpenAutoFocus(syntheticEvent);
        void defaultPrevented;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally fires only on mount (popup open)

    return (
        <PopoverPrimitive.Popup
            data-slot="popover-content"
            initialFocus={onOpenAutoFocus ? false : undefined}
            className={cn(
                'data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 z-50 w-72 origin-(--transform-origin) rounded-lg bg-popover p-2.5 text-popover-foreground text-sm shadow-md outline-hidden ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in',
                className,
            )}
            {...(props as PopoverPrimitive.Popup.Props)}
        />
    );
}

function PopoverContent({
    className,
    align = 'center',
    alignOffset = 0,
    side = 'bottom',
    sideOffset = 4,
    onOpenAutoFocus,
    onInteractOutside,
    ...props
}: PopoverContentProps) {
    const ctx = React.useContext(PopoverContext);

    React.useLayoutEffect(() => {
        if (!ctx) return;
        const ref = ctx.interactOutsideRef;
        ref.current = onInteractOutside;
        return () => {
            ref.current = undefined;
        };
    }, [ctx, onInteractOutside]);

    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
                anchor={ctx?.anchorRef ?? undefined}
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolate z-50"
            >
                <PopoverPopupInner className={className} onOpenAutoFocus={onOpenAutoFocus} {...props} />
            </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
    );
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="popover-header" className={cn('flex flex-col gap-0.5 text-sm', className)} {...props} />;
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
    return <PopoverPrimitive.Title data-slot="popover-title" className={cn('font-medium', className)} {...props} />;
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
    return (
        <PopoverPrimitive.Description
            data-slot="popover-description"
            className={cn('text-muted-foreground', className)}
            {...props}
        />
    );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
