/**
 * Device log domain types and display metadata.
 * Usable in both Convex backend and Next.js frontend.
 * Frontend imports via `@/lib/deviceLogs`.
 */

export type DeviceLogType = 'existence_check' | 'config_fetch' | 'image_fetch';
export type DeviceLogStatus = 'ok' | 'no_content' | 'unauthorized' | 'not_found' | 'error';

export const LOG_TYPE_LABELS: Record<DeviceLogType, string> = {
    existence_check: 'Existence',
    config_fetch: 'Config',
    image_fetch: 'Image',
};

export const LOG_STATUS_LABELS: Record<DeviceLogStatus, string> = {
    ok: 'ok',
    no_content: 'no_content',
    unauthorized: 'unauthorized',
    not_found: 'not_found',
    error: 'error',
};

/** Badge variant for each log type. */
export const LOG_TYPE_VARIANTS: Record<DeviceLogType, 'default' | 'secondary' | 'outline'> = {
    existence_check: 'secondary',
    config_fetch: 'outline',
    image_fetch: 'default',
};

/** Badge variant for each log status. */
export const LOG_STATUS_VARIANTS: Record<DeviceLogStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ok: 'default',
    no_content: 'secondary',
    unauthorized: 'destructive',
    not_found: 'destructive',
    error: 'destructive',
};

/** Chart fill color (CSS variable) for each log type. */
export const LOG_TYPE_CHART_COLOR: Record<DeviceLogType, string> = {
    existence_check: 'var(--chart-3)',
    config_fetch: 'var(--chart-1)',
    image_fetch: 'var(--chart-2)',
};
