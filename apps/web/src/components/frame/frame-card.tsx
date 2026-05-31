'use client';

import Image from 'next/image';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Button } from '@workspace/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { Copy, LayoutGrid, Pencil, Trash2 } from 'lucide-react';
import { ButtonGroup } from '@workspace/ui/components/button-group';
import type { Id } from '@convex/dataModel';

export type Frame = {
    _id: Id<'frames'>;
    name: string;
    description?: string;
    thumbnailUrl: string | null;
    latestJob?: {
        status: 'pending' | 'paused' | 'running' | 'succeeded' | 'failed' | 'cancelled';
        errorMessage?: string;
        jobId?: string;
        updatedAt: number;
    };
    widgets: { id: string; w: number; h: number }[];
    createdAt: number;
    updatedAt: number;
};

export function FrameCard({
    frame,
    canManage,
    onEdit,
    onDelete,
    onDuplicate,
}: {
    frame: Frame;
    canManage: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    return (
        <Card className="hover:bg-accent/50 transition-colors overflow-hidden group">
            {/* Thumbnail area */}
            <div className="border-b bg-muted mx-3 rounded-md">
                <div className="relative aspect-video mx-auto">
                    {frame.thumbnailUrl ? (
                        <Image src={frame.thumbnailUrl} alt={frame.name} fill className="object-contain" unoptimized />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full">
                            <LayoutGrid className="size-12 text-muted-foreground/50" />
                        </div>
                    )}
                </div>
            </div>

            <CardHeader>
                <CardTitle className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{frame.name}</span>
                    <JobStatusBadge latestJob={frame.latestJob} />
                </CardTitle>
                {frame.description && <CardDescription className="truncate">{frame.description}</CardDescription>}
                {canManage && (
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
                                    >
                                        <Pencil className="size-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger render={<span />}>
                                    <Button
                                        render={<div />}
                                        nativeButton={false}
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={onDelete}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
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
                )}
            </CardHeader>

            <CardContent>
                <p className="text-xs text-muted-foreground">
                    {frame.widgets.length} widget{frame.widgets.length !== 1 ? 's' : ''}
                </p>
            </CardContent>
        </Card>
    );
}
