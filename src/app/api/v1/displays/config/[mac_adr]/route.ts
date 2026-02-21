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
 *   - file_path: signed URL to the current rendered image (or null)
 *   - valid_for: minimum TTL in seconds across bound plugin data (-1 if none)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ mac_adr: string }> },
) {
    const { mac_adr } = await params;
    const convex = getConvexClient();
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        undefined;

    try {
        // Look up device by MAC
        const device = await convex.query(asPublic(internal.devices.v1.getByMac), {
            macAddress: mac_adr,
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        if (device.status !== 'active' || device.apiVersion !== 'v1') {
            // Log the unauthorized access attempt
            await convex.mutation(asPublic(internal.devices.v1.logAccess), {
                deviceId: device._id,
                macAddress: mac_adr,
                ipAddress,
                responseStatus: 'unauthorized',
                imageChanged: false,
            });
            return NextResponse.json({ error: 'Device not activated' }, { status: 401 });
        }

        // Heartbeat: update lastSeen, promote next→current
        const result = await convex.mutation(asPublic(internal.devices.v1.heartbeat), {
            id: device.id,
        });

        if (!result) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        // Resolve image URL
        let fileUrl: string | null = null;
        if (result.storageId) {
            fileUrl = await convex.query(asPublic(internal.devices.v1.getStorageUrl), {
                storageId: result.storageId,
            });
        }

        // Get min TTL and binding data snapshot in parallel
        const [validFor, bindingData] = await Promise.all([
            convex.query(asPublic(internal.devices.v1.getMinTtl), {
                deviceId: device.id,
            }),
            convex.query(asPublic(internal.devices.v1.getBindingData), {
                deviceId: device.id,
            }),
        ]);

        // Log successful access
        await convex.mutation(asPublic(internal.devices.v1.logAccess), {
            deviceId: device._id,
            macAddress: mac_adr,
            ipAddress,
            responseStatus: fileUrl ? 'ok' : 'no_content',
            imageChanged: result.imageChanged,
            bindingData,
        });

        return NextResponse.json({ file_path: fileUrl, valid_for: validFor });
    } catch (error) {
        console.error('Config display error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
