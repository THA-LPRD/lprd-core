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
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputList } from '@/components/ui/tags-input';
import { canAddTag, normalizeTags } from '@/lib/tags';

type DeviceFormData = {
    name: string;
    description: string;
    tags: string[];
    status: 'pending' | 'active';
};

type DeviceFormProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: DeviceFormData) => Promise<void>;
    initialData?: Partial<DeviceFormData>;
    mode: 'create' | 'edit';
};

export function DeviceForm({ open, onOpenChange, onSubmit, initialData, mode }: DeviceFormProps) {
    const [name, setName] = React.useState(initialData?.name ?? '');
    const [description, setDescription] = React.useState(initialData?.description ?? '');
    const [tags, setTags] = React.useState<string[]>(initialData?.tags ?? []);
    const [status, setStatus] = React.useState<'pending' | 'active'>(initialData?.status ?? 'pending');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            setName(initialData?.name ?? '');
            setDescription(initialData?.description ?? '');
            setTags(initialData?.tags ?? []);
            setStatus(initialData?.status ?? 'pending');
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                name: name.trim(),
                description: description.trim(),
                tags,
                status,
            });
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{mode === 'create' ? 'Add Device' : 'Edit Device'}</DialogTitle>
                        <DialogDescription>
                            {mode === 'create'
                                ? 'Add a new device to your organization.'
                                : 'Update device information.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Lobby Display"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Main lobby entrance display"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="tags">Tags</Label>
                            <TagsInput
                                value={tags}
                                onValueChange={(value) => setTags(normalizeTags(value))}
                                onValidate={(value) => canAddTag(value, tags)}
                                blurBehavior="add"
                                addOnPaste
                            >
                                {({ value }) => (
                                    <TagsInputList>
                                        {value.map((tag) => (
                                            <TagsInputItem key={tag} value={tag}>
                                                {tag}
                                            </TagsInputItem>
                                        ))}
                                        <TagsInputInput id="tags" placeholder={value.length === 0 ? 'Add tag…' : ''} />
                                    </TagsInputList>
                                )}
                            </TagsInput>
                            <p className="text-xs text-muted-foreground">Enter to add · Backspace to remove last</p>
                        </div>

                        {mode === 'edit' && (
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={status === 'pending' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setStatus('pending')}
                                    >
                                        Pending
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={status === 'active' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setStatus('active')}
                                    >
                                        Active
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting
                                ? mode === 'create'
                                    ? 'Adding...'
                                    : 'Saving...'
                                : mode === 'create'
                                  ? 'Add Device'
                                  : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
