import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import type { FunctionReference } from 'convex/server';
import { getConvexClient } from '@/lib/convex-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asPublic<Type extends FunctionReference<any, 'internal'>>(fn: Type): FunctionReference<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fn as any;
}

/**
 * GET /api/v1/displays/config/:mac_adr
 * Device polls this endpoint to get its current content.
 * Looks up device by MAC address. Returns 401 if device is not active.
 *
 * Returns: { file_path, valid_for }
 *   - file_path: proxy URL to fetch the current image (/api/v1/displays/image/:deviceId)
 *   - valid_for: minimum TTL in seconds across bound plugin data (-1 if none)
 */
export async function GET(request: Request, { params }: { params: Promise<{ mac_adr: string }> }) {
    const { mac_adr } = await params;
    const convex = getConvexClient();
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;

    try {
        // Look up device by MAC
        const device = await convex.query(asPublic(internal.devices.v1.getByMac), {
            macAddress: mac_adr,
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        if (device.status !== 'active' || device.apiVersion !== 'v1') {
            await convex.mutation(asPublic(internal.devices.accessLogs.log), {
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
        const result = await convex.mutation(asPublic(internal.devices.v1.heartbeat), {
            id: device.id,
        });

        if (!result) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        // Build the proxy URL for this device
        const hasImage = result.storageId != null;
        const filePath = hasImage ? `/api/v1/displays/image/${device.id}` : null;

        // Get min TTL and binding data snapshot in parallel
        const [validFor, bindingData] = await Promise.all([
            convex.query(asPublic(internal.devices.v1.getMinTtl), {
                deviceId: device.id,
            }),
            convex.query(asPublic(internal.devices.v1.getBindingData), {
                deviceId: device.id,
            }),
        ]);

        // Log the config fetch (with snapshot if image is changing)
        await convex.mutation(asPublic(internal.devices.accessLogs.logWithSnapshot), {
            deviceId: device._id,
            macAddress: mac_adr,
            ipAddress,
            responseStatus: hasImage ? 'ok' : 'no_content',
            imageChanged: result.hasNext,
            bindingData: result.hasNext ? bindingData : undefined,
        });

        return NextResponse.json({ file_path: filePath, valid_for: validFor });
    } catch (error) {
        console.error('Config display error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
