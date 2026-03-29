import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference, FunctionReturnType, FunctionVisibility } from 'convex/server';
import { NextResponse } from 'next/server';
import { internal } from '@convex/api';

type LegacyDeviceConvexClient = Omit<ConvexHttpClient, 'query' | 'mutation'> & {
    setAdminAuth(token: string): void;
    query<Ref extends FunctionReference<'query', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
    mutation<Ref extends FunctionReference<'mutation', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!) as unknown as LegacyDeviceConvexClient;

convex.setAdminAuth(process.env.CONVEX_DEPLOY_KEY!);

/**
 * GET /api/v1/displays/:mac
 * Returns 200 if the MAC is registered as an active v1 device, 403 otherwise.
 */
export async function GET(request: Request, { params }: { params: Promise<{ mac_adr: string }> }) {
    const { mac_adr } = await params;
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;

    const device = await convex.query(internal.devices.v1.getByMac, {
        macAddress: mac_adr,
    });

    const isActive = device?.status === 'active' && device.apiVersion === 'v1';

    if (device) {
        await convex.mutation(internal.devices.accessLogs.log, {
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
