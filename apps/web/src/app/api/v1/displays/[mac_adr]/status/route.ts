import { internal } from '@convex/api';
import { NextResponse } from 'next/server';
import { createLegacyDeviceConvexClient } from '@/lib/legacy-device-convex';

type BatteryPayload =
    | {
          present: false;
      }
    | {
          present: true;
          voltage_v: number;
          state_of_charge_percent: number;
      }
    | {
          present: true;
          error: string;
      };

type BatteryStatus =
    | {
          present: false;
          reportedAt: number;
      }
    | {
          present: true;
          voltageV: number;
          stateOfChargePercent: number;
          reportedAt: number;
      }
    | {
          present: true;
          error: string;
          reportedAt: number;
      };

function parseBatteryPayload(body: unknown): BatteryPayload | null {
    if (typeof body !== 'object' || body === null || !('battery' in body)) return null;

    const battery = (body as { battery: unknown }).battery;
    if (typeof battery !== 'object' || battery === null || !('present' in battery)) return null;

    const value = battery as Record<string, unknown>;
    if (value.present === false) return { present: false };

    if (value.present !== true) return null;

    if (typeof value.error === 'string') {
        const error = value.error.trim();
        return error ? { present: true, error } : null;
    }

    if (typeof value.voltage_v === 'number' && typeof value.state_of_charge_percent === 'number') {
        return {
            present: true,
            voltage_v: value.voltage_v,
            state_of_charge_percent: value.state_of_charge_percent,
        };
    }

    return null;
}

function toBatteryStatus(payload: BatteryPayload, reportedAt: number): BatteryStatus {
    if (!payload.present) {
        return { present: false, reportedAt };
    }

    if ('error' in payload) {
        return { present: true, error: payload.error, reportedAt };
    }

    return {
        present: true,
        voltageV: payload.voltage_v,
        stateOfChargePercent: payload.state_of_charge_percent,
        reportedAt,
    };
}

/**
 * POST /api/v1/displays/:mac/status
 * Stores the latest battery status reported by a v1 display.
 */
export async function POST(request: Request, { params }: { params: Promise<{ mac_adr: string }> }) {
    const { mac_adr } = await params;
    const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const battery = parseBatteryPayload(body);
    if (!battery) {
        return NextResponse.json({ error: 'Invalid battery status payload' }, { status: 400 });
    }

    try {
        const convex = createLegacyDeviceConvexClient();

        const device = await convex.query(internal.devices.v1.getByMac, {
            macAddress: mac_adr,
        });

        if (!device) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        const isActive = device.status === 'active' && device.apiVersion === 'v1';

        await convex.mutation(internal.devices.accessLogs.logStatusReport, {
            deviceId: device._id,
            macAddress: mac_adr,
            ipAddress,
            responseStatus: isActive ? 'ok' : 'unauthorized',
            batteryStatus: toBatteryStatus(battery, Date.now()),
        });

        if (!isActive) {
            return NextResponse.json({ error: 'Device not activated' }, { status: 401 });
        }

        return NextResponse.json({});
    } catch (error) {
        console.error('Display status error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
