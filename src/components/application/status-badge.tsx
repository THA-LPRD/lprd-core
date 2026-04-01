import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Active', variant: 'default' },
    inactive: { label: 'Inactive', variant: 'secondary' },
    suspended: { label: 'Suspended', variant: 'destructive' },
    removed: { label: 'Removed', variant: 'destructive' },
};

export function ApplicationStatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] ?? { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

const healthConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unknown: { label: 'Unknown', variant: 'outline' },
    healthy: { label: 'Healthy', variant: 'default' },
    degraded: { label: 'Degraded', variant: 'secondary' },
    unhealthy: { label: 'Unhealthy', variant: 'destructive' },
};

export function PluginHealthBadge({ status }: { status?: string }) {
    const config = healthConfig[status ?? 'unknown'] ?? { label: status ?? 'Unknown', variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}
