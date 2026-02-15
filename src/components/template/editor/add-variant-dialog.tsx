'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { GRID_COLS, GRID_ROWS } from '@/lib/render/constants';

type TemplateVariant = { type: 'content'; w: number; h: number } | { type: 'background' } | { type: 'foreground' };

type VariantType = 'content' | 'background' | 'foreground';

export function AddVariantDialog({
    open,
    onOpenChangeAction,
    onAddAction,
}: {
    open: boolean;
    onOpenChangeAction: (open: boolean) => void;
    onAddAction: (variant: TemplateVariant) => void;
}) {
    const [variantType, setVariantType] = React.useState<VariantType>('content');
    const [w, setW] = React.useState(3);
    const [h, setH] = React.useState(2);

    React.useEffect(() => {
        if (open) {
            setVariantType('content');
            setW(3);
            setH(2);
        }
    }, [open]);

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (variantType === 'content') {
            onAddAction({
                type: 'content',
                w: Math.max(1, Math.min(GRID_COLS, w)),
                h: Math.max(1, Math.min(GRID_ROWS, h)),
            });
        } else if (variantType === 'background') {
            onAddAction({ type: 'background' });
        } else {
            onAddAction({ type: 'foreground' });
        }
        onOpenChangeAction(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChangeAction}>
            <DialogContent className="sm:max-w-sm">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Variant</DialogTitle>
                        <DialogDescription>Add a new size variant to this template.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <div className="flex gap-2">
                                {(['content', 'background', 'foreground'] as const).map((t) => (
                                    <Button
                                        key={t}
                                        type="button"
                                        variant={variantType === t ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setVariantType(t)}
                                    >
                                        {t === 'content' ? 'Content' : t === 'background' ? 'Background' : 'Foreground'}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {variantType === 'content' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="variant-w">Width (1-{GRID_COLS} cols)</Label>
                                    <Input
                                        id="variant-w"
                                        type="number"
                                        min={1}
                                        max={GRID_COLS}
                                        value={w}
                                        onChange={(e) => setW(Number(e.target.value))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="variant-h">Height (1-{GRID_ROWS} rows)</Label>
                                    <Input
                                        id="variant-h"
                                        type="number"
                                        min={1}
                                        max={GRID_ROWS}
                                        value={h}
                                        onChange={(e) => setH(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChangeAction(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Variant</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
