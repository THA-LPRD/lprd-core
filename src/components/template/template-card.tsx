'use client';

import Image from 'next/image';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, LayoutTemplate, Pencil, Trash2 } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group';
import type { Id } from '@convex/dataModel';
import type { TemplateVariant } from '@/lib/template';

export type Template = {
    _id: Id<'templates'>;
    scope: 'global' | 'site';
    name: string;
    description?: string;
    variants: TemplateVariant[];
    thumbnailUrl: string | null;
    createdAt: number;
    updatedAt: number;
};

function variantLabel(v: TemplateVariant): string {
    if (v.type === 'content') return `${v.w}×${v.h}`;
    if (v.type === 'background') return 'BG';
    return 'FG';
}

export function TemplateCard({
    template,
    onEdit,
    onDelete,
    onDuplicate,
}: {
    template: Template;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const isGlobal = template.scope === 'global';

    return (
        <Card className="hover:bg-accent/50 transition-colors overflow-hidden group">
            {/* Thumbnail area */}
            <div className="border-b bg-muted mx-3 rounded-md">
                <div className="relative aspect-video mx-auto">
                    {template.thumbnailUrl ? (
                        <Image
                            src={template.thumbnailUrl}
                            alt={template.name}
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full">
                            <LayoutTemplate className="size-12 text-muted-foreground/50" />
                        </div>
                    )}
                </div>
            </div>

            <CardHeader>
                <CardTitle className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{template.name}</span>
                    <Badge variant={isGlobal ? 'outline' : 'secondary'} className="text-xs shrink-0">
                        {isGlobal ? 'Global' : 'Org'}
                    </Badge>
                </CardTitle>
                {template.description && <CardDescription className="truncate">{template.description}</CardDescription>}
                <CardAction>
                    <ButtonGroup>
                        <Tooltip>
                            <TooltipTrigger render={<span />}>
                                <Button
                                    render={<div />}
                                    nativeButton={false}
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={onEdit}
                                    disabled={isGlobal}
                                >
                                    <Pencil className="size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isGlobal ? 'Global templates are read-only' : 'Edit'}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger render={<span />}>
                                <Button
                                    render={<div />}
                                    nativeButton={false}
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={onDelete}
                                    disabled={isGlobal}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isGlobal ? 'Global templates are read-only' : 'Delete'}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger render={<span />}>
                                <Button
                                    render={<div />}
                                    nativeButton={false}
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={onDuplicate}
                                >
                                    <Copy className="size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
                        </Tooltip>
                    </ButtonGroup>
                </CardAction>
            </CardHeader>

            <CardContent>
                <div className="flex flex-wrap gap-1">
                    {template.variants.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                            {variantLabel(v)}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
