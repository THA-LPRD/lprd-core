'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

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
    const [tagInput, setTagInput] = React.useState('');
    const [status, setStatus] = React.useState<'pending' | 'active'>(initialData?.status ?? 'pending');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            setName(initialData?.name ?? '');
            setDescription(initialData?.description ?? '');
            setTags(initialData?.tags ?? []);
            setStatus(initialData?.status ?? 'pending');
            setTagInput('');
        }
    }, [open, initialData]);

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
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
                            <div className="flex gap-2">
                                <Input
                                    id="tags"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add tag..."
                                />
                                <Button type="button" variant="secondary" onClick={handleAddTag}>
                                    Add
                                </Button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="gap-1">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="hover:bg-muted rounded-full"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
