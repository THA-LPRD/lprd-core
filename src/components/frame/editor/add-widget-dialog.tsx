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

type Widget = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

/**
 * Find the first available grid position for a widget of given size.
 * Scans row by row, column by column.
 */
function findAvailablePosition(widgets: Widget[], w: number, h: number): { x: number; y: number } | null {
    for (let y = 0; y <= GRID_ROWS - h; y++) {
        for (let x = 0; x <= GRID_COLS - w; x++) {
            const overlaps = widgets.some(
                (widget) => x < widget.x + widget.w && x + w > widget.x && y < widget.y + widget.h && y + h > widget.y,
            );
            if (!overlaps) return { x, y };
        }
    }
    return null;
}

export function AddWidgetDialog({
    open,
    onOpenChange,
    existingWidgets,
    onAdd,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingWidgets: Widget[];
    onAdd: (widget: Widget) => void;
}) {
    const [w, setW] = React.useState(5);
    const [h, setH] = React.useState(3);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setW(5);
            setH(3);
            setError('');
        }
    }, [open]);

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const cw = Math.max(1, Math.min(GRID_COLS, w));
        const ch = Math.max(1, Math.min(GRID_ROWS, h));

        const pos = findAvailablePosition(existingWidgets, cw, ch);
        if (!pos) {
            setError('No available space for this widget size. Try a smaller size or remove existing widgets.');
            return;
        }

        onAdd({
            id: crypto.randomUUID(),
            x: pos.x,
            y: pos.y,
            w: cw,
            h: ch,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Widget</DialogTitle>
                        <DialogDescription>Add a content widget to the frame grid.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="widget-w">Width (1-{GRID_COLS} cols)</Label>
                                <Input
                                    id="widget-w"
                                    type="number"
                                    min={1}
                                    max={GRID_COLS}
                                    value={w}
                                    onChange={(e) => {
                                        setW(Number(e.target.value));
                                        setError('');
                                    }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="widget-h">Height (1-{GRID_ROWS} rows)</Label>
                                <Input
                                    id="widget-h"
                                    type="number"
                                    min={1}
                                    max={GRID_ROWS}
                                    value={h}
                                    onChange={(e) => {
                                        setH(Number(e.target.value));
                                        setError('');
                                    }}
                                />
                            </div>
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Widget</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
