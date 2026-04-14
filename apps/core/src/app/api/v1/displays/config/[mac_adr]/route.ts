import { internal } from '@convex/api';
import { NextResponse } from 'next/server';
import { createLegacyDeviceConvexClient } from '@/lib/legacy-device-convex';

/**
 * GET /api/v1/displays/config/:mac_adr
 * Device polls this endpoint to get its current content.
 * Looks up device by MAC address. Returns 401 if device is not active.
 *
 * Returns: { file_path, valid_for }
 *   - file_path: proxy URL to fetch the current image (/api/v1/displays/image/:deviceId)
 *   - valid_for: app-resolved sleep interval in seconds
 */
export async function GET(request: Request, { params }: { params: Promise<{ mac_adr: string }> }) {
    const { mac_adr } = await params;
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;

    try {
        const convex = createLegacyDeviceConvexClient();

        // Look up device by MAC
        const device = await convex.query(internal.devices.v1.getByMac, {
            macAddress: mac_adr,
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        if (device.status !== 'active' || device.apiVersion !== 'v1') {
            await convex.mutation(internal.devices.accessLogs.log, {
                deviceId: device._id,
                macAddress: mac_adr,
                type: 'config_fetch',
                ipAddress,
                responseStatus: 'unauthorized',
                imageChanged: false,
            });
            return NextResponse.json({ error: 'Device not activated' }, { status: 401 });
        }

        // Update lastSeen only (no promotion — that's the image endpoint's job)
        const result = await convex.mutation(internal.devices.v1.heartbeat, {
            id: device._id,
        });

        if (!result) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        // Build the proxy URL for this device
        const hasImage = result.storageId != null;
        const filePath = hasImage ? `/api/v1/displays/image/${device._id}` : null;

        // Resolve app-owned wake policy and binding data snapshot in parallel.
        const [wakePlan, bindingData] = await Promise.all([
            convex.query(internal.devices.v1.getWakePlan, {
                deviceId: device._id,
            }),
            convex.query(internal.devices.v1.getBindingData, {
                deviceId: device._id,
            }),
        ]);

        if (!wakePlan) {
            console.error(`Wake plan not found for device ${device._id}`);
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        // Log the config fetch (with snapshot if image is changing)
        await convex.mutation(internal.devices.accessLogs.logWithSnapshot, {
            deviceId: device._id,
            macAddress: mac_adr,
            ipAddress,
            responseStatus: hasImage ? 'ok' : 'no_content',
            imageChanged: result.hasNext,
            bindingData: result.hasNext ? bindingData : undefined,
        });

        return NextResponse.json({
            file_path: filePath,
            valid_for: wakePlan.validForSeconds,
            valid_for_reason: wakePlan.reason,
        });
    } catch (error) {
        console.error('Config display error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
