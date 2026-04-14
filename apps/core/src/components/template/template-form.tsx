'use client';

import * as React from 'react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';

type TemplateFormData = {
    name: string;
    description: string;
};

type TemplateFormProps = {
    open: boolean;
    onOpenChangeAction: (open: boolean) => void;
    onSubmitAction: (data: TemplateFormData) => Promise<void>;
};

export function TemplateForm({ open, onOpenChangeAction, onSubmitAction }: TemplateFormProps) {
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
                        <DialogTitle>New Template</DialogTitle>
                        <DialogDescription>Create a new template for your organization.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="template-name">Name</Label>
                            <Input
                                id="template-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Weather Widget"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="template-description">Description</Label>
                            <Input
                                id="template-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Shows current weather conditions"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChangeAction(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? 'Creating...' : 'Create Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
