import type { Id } from '@convex/dataModel';

export type Binding = {
    widgetId: string;
    pluginId: Id<'plugins'>;
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
    frameId?: Id<'frames'>;
    dataBindings?: Binding[];
    createdAt: number;
    updatedAt: number;
};
