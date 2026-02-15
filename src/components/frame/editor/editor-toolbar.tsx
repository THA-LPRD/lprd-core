'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Save } from 'lucide-react';

export function EditorToolbar({
    orgSlug,
    name,
    onNameChange,
    isDirty,
    isSaving,
    onSave,
}: {
    orgSlug: string;
    name: string;
    onNameChange: (name: string) => void;
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
            <Link href={`/org/${orgSlug}/frames`}>
                <Button variant="ghost" size="icon" className="size-8">
                    <ArrowLeft className="size-4" />
                </Button>
            </Link>

            <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="max-w-xs font-medium border-transparent hover:border-input focus:border-input transition-colors"
            />

            {isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}

            <div className="ml-auto">
                <Tooltip>
                    <TooltipTrigger render={<span />}>
                        <Button
                            render={<div />}
                            nativeButton={false}
                            onClick={onSave}
                            disabled={!isDirty || isSaving}
                            size="sm"
                        >
                            <Save className="size-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </TooltipTrigger>
                </Tooltip>
            </div>
        </div>
    );
}
