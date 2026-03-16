'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Id } from '@convex/dataModel';

type Frame = {
    _id: Id<'frames'>;
    name: string;
    thumbnailUrl?: string | null;
};

export function FrameAssignmentCard({
    frames,
    selectedFrameId,
    onFrameChange,
}: {
    frames: Frame[] | undefined;
    selectedFrameId: Id<'frames'> | null;
    onFrameChange: (frameId: Id<'frames'> | null) => void;
}) {
    const selectedFrame = frames?.find((f) => f._id === selectedFrameId);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Frame Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select
                    value={selectedFrameId ?? '__none__'}
                    onValueChange={(val) => {
                        onFrameChange(val === '__none__' ? null : (val as Id<'frames'>));
                    }}
                >
                    <SelectTrigger className="w-1/2">
                        <SelectValue placeholder="Select a frame">
                            <span className="truncate block">{selectedFrame ? selectedFrame.name : 'No frame'}</span>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="__none__">No frame</SelectItem>
                        {frames?.map((f) => (
                            <SelectItem key={f._id} value={f._id}>
                                {f.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedFrame?.thumbnailUrl && (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={selectedFrame.thumbnailUrl}
                            alt={selectedFrame.name}
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
