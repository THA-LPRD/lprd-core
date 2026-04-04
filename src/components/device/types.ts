import type { Id } from '@convex/dataModel';

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
    latestJob?: { status: 'pending' | 'running' | 'succeeded' | 'failed'; errorMessage?: string };
    frameId?: Id<'frames'>;
    dataBindings?: Binding[];
    createdAt: number;
    updatedAt: number;
};
