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
    latestConfigFetch?: {
        accessedAt: number;
        validForSeconds?: number;
        validForReason?: 'fresh_data' | 'stale_data' | 'missing_data' | 'unbound' | 'off_hours';
    } | null;
    latestBatteryStatus?:
        | {
              present: false;
              reportedAt: number;
          }
        | {
              present: true;
              voltageV: number;
              stateOfChargePercent: number;
              reportedAt: number;
          }
        | {
              present: true;
              error: string;
              reportedAt: number;
          };
    frameId?: Id<'frames'>;
    dataBindings?: Binding[];
    wakePolicy?: DeviceWakePolicy;
    createdAt: number;
    updatedAt: number;
};
