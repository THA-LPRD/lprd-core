export type {
    DeviceDataFreshness,
    DeviceOffHoursWindow,
    DeviceWakePlan,
    DeviceWakePolicy,
    DeviceWakeReason,
} from '@convex/lib/deviceWakePolicy';

export {
    createDefaultDeviceWakePolicy,
    DEFAULT_DEVICE_WAKE_POLICY,
    getOffHoursSleepSeconds,
    resolveDeviceWakePlan,
} from '@convex/lib/deviceWakePolicy';
