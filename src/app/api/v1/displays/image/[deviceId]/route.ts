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
 * GET /api/v1/displays/image/:deviceId
 *
 * Image proxy for v1 devices. Owning the next→current transition here means
 * the image fetch is the true "device has displayed this content" moment.
 *
 * 1. Looks up device by UUIDv4
 * 2. Promotes next→current if pending
 * 3. Fetches image bytes from Convex storage and streams to the client
 * 4. Logs an image_fetch entry
 */
export async function GET(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
    const { deviceId } = await params;
    const convex = getConvexClient();
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;

    try {
        const device = await convex.query(asPublic(internal.devices.v1.getById), { id: deviceId });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        if (device.status !== 'active' || device.apiVersion !== 'v1') {
            await convex.mutation(asPublic(internal.devices.accessLogs.log), {
                deviceId: device._id,
                macAddress: device.macAddress ?? '',
                type: 'image_fetch',
                ipAddress,
                responseStatus: 'unauthorized',
                imageChanged: false,
            });
            return NextResponse.json({ error: 'Device not activated' }, { status: 401 });
        }

        // Promote next→current before serving
        const imageChanged = await convex.mutation(asPublic(internal.devices.v1.promoteNext), {
            id: device.id,
        });

        // Re-fetch device to get the current storageId after potential promotion
        const updatedDevice = await convex.query(asPublic(internal.devices.v1.getById), {
            id: deviceId,
        });

        const storageId = updatedDevice?.current?.storageId ?? null;

        if (!storageId) {
            await convex.mutation(asPublic(internal.devices.accessLogs.log), {
                deviceId: device._id,
                macAddress: device.macAddress ?? '',
                type: 'image_fetch',
                ipAddress,
                responseStatus: 'no_content',
                imageChanged: false,
            });
            return new NextResponse(null, { status: 204 });
        }

        // Get a signed URL and stream the bytes through
        const url = await convex.query(asPublic(internal.devices.v1.getStorageUrl), { storageId });

        if (!url) {
            await convex.mutation(asPublic(internal.devices.accessLogs.log), {
                deviceId: device._id,
                macAddress: device.macAddress ?? '',
                type: 'image_fetch',
                ipAddress,
                responseStatus: 'error',
                imageChanged: false,
            });
            return NextResponse.json({ error: 'Image not available' }, { status: 502 });
        }

        const upstream = await fetch(url);
        if (!upstream.ok) {
            await convex.mutation(asPublic(internal.devices.accessLogs.log), {
                deviceId: device._id,
                macAddress: device.macAddress ?? '',
                type: 'image_fetch',
                ipAddress,
                responseStatus: 'error',
                imageChanged: false,
            });
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
        }

        await convex.mutation(asPublic(internal.devices.accessLogs.log), {
            deviceId: device._id,
            macAddress: device.macAddress ?? '',
            type: 'image_fetch',
            ipAddress,
            responseStatus: 'ok',
            imageChanged,
        });

        const contentType = upstream.headers.get('content-type') ?? 'image/png';
        return new NextResponse(upstream.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
