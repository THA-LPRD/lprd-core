import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { asPublic, getConvexClient } from '@/lib/convex-server';

/**
 * GET /api/v1/displays/:mac
 * Returns 200 if the MAC is registered as an active v1 device, 403 otherwise.
 */
export async function GET(request: Request, { params }: { params: Promise<{ mac_adr: string }> }) {
    const { mac_adr } = await params;
    const convex = getConvexClient();
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;

    const device = await convex.query(asPublic(internal.devices.v1.getByMac), {
        macAddress: mac_adr,
    });

    const isActive = device?.status === 'active' && device.apiVersion === 'v1';

    if (device) {
        await convex.mutation(asPublic(internal.devices.accessLogs.log), {
            deviceId: device._id,
            macAddress: mac_adr,
            type: 'existence_check',
            ipAddress,
            responseStatus: isActive ? 'ok' : 'unauthorized',
            imageChanged: false,
        });
    }

    if (isActive) {
        return new NextResponse('{}', { status: 200 });
    }

    return new NextResponse('{}', { status: 403 });
}
