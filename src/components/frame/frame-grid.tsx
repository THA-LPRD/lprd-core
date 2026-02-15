'use client';

import { type Frame, FrameCard } from './frame-card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { LayoutGrid } from 'lucide-react';

export function FrameGridView({
    frames,
    canManage,
    onEdit,
    onDelete,
    onDuplicate,
}: {
    frames: Frame[];
    canManage: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
}) {
    if (frames.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <LayoutGrid />
                    </EmptyMedia>
                    <EmptyTitle>No frames yet</EmptyTitle>
                    <EmptyDescription>Create your first frame to get started</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {frames.map((frame) => (
                <FrameCard
                    key={frame._id}
                    frame={frame}
                    canManage={canManage}
                    onEdit={() => onEdit(frame._id)}
                    onDelete={() => onDelete(frame._id)}
                    onDuplicate={() => onDuplicate(frame._id)}
                />
            ))}
        </div>
    );
}
