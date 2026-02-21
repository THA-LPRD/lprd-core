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
 * GET /api/v1/displays/:mac
 * Returns 200 if the MAC is registered as an active v1 device, 403 otherwise.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ mac_adr: string }> },
) {
    const { mac_adr } = await params;
    const convex = getConvexClient();

    const device = await convex.query(asPublic(internal.devices.v1.getByMac), {
        macAddress: mac_adr,
    });

    if (device?.status === 'active' && device.apiVersion === 'v1') {
        return new NextResponse("{}", { status: 200 });
    }

    return new NextResponse("{}", { status: 403 });
}