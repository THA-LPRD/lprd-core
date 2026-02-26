'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

export function DeviceInfoCard({
    name,
    onNameChange,
    description,
    onDescriptionChange,
    tags,
    onTagsChange,
    status,
    onStatusChange,
}: {
    name: string;
    onNameChange: (name: string) => void;
    description: string;
    onDescriptionChange: (description: string) => void;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    status: 'pending' | 'active';
    onStatusChange: (status: 'pending' | 'active') => void;
}) {
    const [tagInput, setTagInput] = React.useState('');

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            onTagsChange([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Device Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="cfg-name">Name</Label>
                    <Input
                        id="cfg-name"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Lobby Display"
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="cfg-description">Description</Label>
                    <Input
                        id="cfg-description"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Main lobby entrance display"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="cfg-tags">Tags</Label>
                    <div className="flex gap-2">
                        <Input
                            id="cfg-tags"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Add tag..."
                        />
                        <Button type="button" variant="secondary" onClick={handleAddTag}>
                            Add
                        </Button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="gap-1 p-2.5">
                                    <span className="-mt-1">{tag}</span>
                                    <Button
                                        variant="ghost"
                                        onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
                                        className="hover:bg-muted px-0"
                                    >
                                        <X className="size-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label>Status</Label>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={status === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onStatusChange('pending')}
                        >
                            Pending
                        </Button>
                        <Button
                            type="button"
                            variant={status === 'active' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onStatusChange('active')}
                        >
                            Active
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
