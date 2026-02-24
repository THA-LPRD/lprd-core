import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import type { FunctionReference } from 'convex/server';
import { getConvexClient } from '@/lib/convex-server';
import { generateThumbnail } from '@/lib/render/thumbnail';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';

/** Admin-authed client can call internal functions; this cast satisfies TypeScript. */
function asPublic<
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Type extends FunctionReference<any, 'internal'>,
>(
    fn: Type,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): FunctionReference<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fn as any;
}

const WIDTH = GRID_COLS * DEFAULT_CELL_SIZE;
const HEIGHT = GRID_ROWS * DEFAULT_CELL_SIZE;

/**
 * POST /api/v2/plugin/webhook/data
 * Receives data pushed by a plugin, stores it in Convex,
 * then renders affected devices via Playwright.
 */
export async function POST(request: Request) {
    try {
        const pluginId = request.headers.get('X-Plugin-Id');
        if (!pluginId) {
            return NextResponse.json({ error: 'X-Plugin-Id header is required' }, { status: 400 });
        }

        const body = await request.json();
        const { data, ttl_seconds, org_slug, topic, entry } = body;

        if (data === undefined || !ttl_seconds || !org_slug || !topic || !entry) {
            return NextResponse.json(
                { error: 'data, ttl_seconds, org_slug, topic, and entry are required' },
                { status: 400 },
            );
        }

        const convex = getConvexClient();

        // Store the data in Convex
        const result = await convex.mutation(asPublic(internal.plugins.data.storeWebhookData), {
            pluginId,
            orgSlug: org_slug,
            contentType: 'plugin_data',
            data,
            ttlSeconds: ttl_seconds,
            topic,
            entry,
        });

        // Find affected devices
        const affectedDeviceIds = await convex.query(asPublic(internal.plugins.data.listAffectedDevices), {
            pluginId: result.pluginId,
            organizationId: result.organizationId,
            topic,
            entry,
        });

        // Render affected devices in parallel
        const { origin, hostname } = new URL(request.url);

        await Promise.all(
            affectedDeviceIds.map(async (deviceId: string) => {
                try {
                    const png = await generateThumbnail({
                        renderPath: `/org/${result.orgSlug}/devices/render/${deviceId}`,
                        width: WIDTH,
                        height: HEIGHT,
                        origin,
                        hostname,
                    });

                    // Upload PNG to Convex storage
                    const uploadUrl = await convex.mutation(asPublic(internal.plugins.data.generateRenderUploadUrl), {});
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'image/png' },
                        body: png,
                    });
                    const { storageId } = await uploadRes.json();

                    // Set as device.next
                    await convex.mutation(asPublic(internal.plugins.data.setDeviceNext), {
                        deviceId,
                        storageId,
                        renderedAt: Date.now(),
                    });
                } catch (err) {
                    console.error(`Failed to render device ${deviceId}:`, err);
                }
            }),
        );

        return new Response(null, { status: 202 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';

        if (message.includes('not found') || message.includes('not active')) {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        console.error('Plugin data error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
