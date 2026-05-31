'use client';

import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Input } from '@workspace/ui/components/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { ArrowLeft, Save } from 'lucide-react';

export function EditorToolbar({
    siteSlug,
    name,
    onNameChangeAction,
    scope,
    isDirty,
    isSaving,
    onSaveAction,
}: {
    siteSlug: string;
    name: string;
    onNameChangeAction: (name: string) => void;
    scope: 'organization' | 'site';
    isDirty: boolean;
    isSaving: boolean;
    onSaveAction: () => void;
}) {
    const isOrganizationScoped = scope === 'organization';

    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
            <Link href={`/site/${siteSlug}/templates`}>
                <Button variant="ghost" size="icon" className="size-8">
                    <ArrowLeft className="size-4" />
                </Button>
            </Link>

            <Input
                value={name}
                onChange={(e) => onNameChangeAction(e.target.value)}
                disabled={isOrganizationScoped}
                className="max-w-xs font-medium border-transparent hover:border-input focus:border-input transition-colors"
            />

            <Badge variant={isOrganizationScoped ? 'outline' : 'secondary'}>
                {isOrganizationScoped ? 'Organization' : 'Site'}
            </Badge>

            {isDirty && !isOrganizationScoped && <span className="text-xs text-muted-foreground">Unsaved changes</span>}

            <div className="ml-auto">
                <Tooltip>
                    <TooltipTrigger render={<span />}>
                        <Button
                            render={<div />}
                            nativeButton={false}
                            onClick={onSaveAction}
                            disabled={isOrganizationScoped || !isDirty || isSaving}
                            size="sm"
                        >
                            <Save className="size-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </TooltipTrigger>
                    {isOrganizationScoped && <TooltipContent>Organization templates are read-only</TooltipContent>}
                </Tooltip>
            </div>
        </div>
    );
}
