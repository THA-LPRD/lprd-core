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

type FrameFormData = {
    name: string;
    description: string;
};

type FrameFormProps = {
    open: boolean;
    onOpenChangeAction: (open: boolean) => void;
    onSubmitAction: (data: FrameFormData) => Promise<void>;
};

export function FrameForm({ open, onOpenChangeAction, onSubmitAction }: FrameFormProps) {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setName('');
            setDescription('');
        }
    }, [open]);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmitAction({
                name: name.trim(),
                description: description.trim(),
            });
            onOpenChangeAction(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChangeAction}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>New Frame</DialogTitle>
                        <DialogDescription>Create a new frame for your organization.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="frame-name">Name</Label>
                            <Input
                                id="frame-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Main Display"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="frame-description">Description</Label>
                            <Input
                                id="frame-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Primary display frame"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChangeAction(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? 'Creating...' : 'Create Frame'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
