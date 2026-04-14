'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@/lib/utils';

type DeviceStatus = 'pending' | 'active';

const statusConfig: Record<DeviceStatus, { color: string; label: string; description: string }> = {
    active: {
        color: 'bg-green-500',
        label: 'Active',
        description: 'Device is connected and working',
    },
    pending: {
        color: 'bg-yellow-500',
        label: 'Pending',
        description: 'Device is waiting for activation',
    },
};

export function DeviceStatusDot({ status, className }: { status: DeviceStatus; className?: string }) {
    const config = statusConfig[status];

    return (
        <Tooltip>
            <TooltipTrigger>
                <span
                    className={cn('inline-block size-2.5 rounded-full shrink-0', config.color, className)}
                    aria-label={config.label}
                />
            </TooltipTrigger>
            <TooltipContent>
                <p className="font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
            </TooltipContent>
        </Tooltip>
    );
}
