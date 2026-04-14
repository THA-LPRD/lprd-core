import type { Id } from '@convex/dataModel';
import type { DeviceWakePolicy } from '@/lib/deviceWakePolicy';

export type Binding = {
    widgetId: string;
    applicationId: Id<'applications'>;
    topic: string;
    entry: string;
};

export type DeviceData = {
    _id: Id<'devices'>;
    name: string;
    description?: string;
    tags: string[];
    status: 'pending' | 'active';
    lastSeen?: number;
    lastUrl?: string | null;
    currentUrl?: string | null;
    nextUrl?: string | null;
    latestJob?: {
        status: 'pending' | 'paused' | 'running' | 'succeeded' | 'failed' | 'cancelled';
        errorMessage?: string;
        jobId?: string;
        updatedAt: number;
    };
    frameId?: Id<'frames'>;
    dataBindings?: Binding[];
    wakePolicy?: DeviceWakePolicy;
    createdAt: number;
    updatedAt: number;
};
