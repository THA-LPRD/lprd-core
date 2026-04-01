import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { convexAdmin } from '@/lib/convex-admin';
import { generateScreenshot } from '@/lib/render/thumbnail';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';
import { authenticatePlugin, AuthError, requireScope, requireSiteAccess } from '@/lib/application/auth';

const WIDTH = GRID_COLS * DEFAULT_CELL_SIZE;
const HEIGHT = GRID_ROWS * DEFAULT_CELL_SIZE;

/**
 * POST /api/v2/plugin/webhook/data
 * Receives data pushed by a plugin, stores it in Convex,
 * then renders affected devices via Playwright.
 * Authenticated via Bearer JWT token.
 */
export async function POST(request: Request) {
    try {
        // Authenticate plugin via JWT
        const plugin = await authenticatePlugin(request);
        requireScope(plugin, 'push_data');

        const body = await request.json();
        const { data, ttl_seconds, org_slug, topic, entry } = body;

        if (data === undefined || !ttl_seconds || !org_slug || !topic || !entry) {
            return NextResponse.json(
                { error: 'data, ttl_seconds, org_slug, topic, and entry are required' },
                { status: 400 },
            );
        }

        // Check site access (plugin active + enabledByAdmin + enabledByOrg)
        await requireSiteAccess(plugin._id, org_slug);

        // Store the data in Convex
        const result = await convexAdmin.mutation(internal.applications.plugin.data.storeWebhookData, {
            pluginId: plugin._id,
            siteSlug: org_slug,
            contentType: 'plugin_data',
            data,
            ttlSeconds: ttl_seconds,
            topic,
            entry,
        });

        // Find affected devices
        const affectedDeviceIds = await convexAdmin.query(internal.applications.plugin.data.listAffectedDevices, {
            pluginId: result.pluginId,
            siteId: result.siteId,
            topic,
            entry,
        });

        // Render affected devices in parallel
        const { origin } = new URL(request.url);

        await Promise.all(
            affectedDeviceIds.map(async (deviceId) => {
                try {
                    const png = await generateScreenshot({
                        renderPath: `/site/${result.siteSlug}/devices/render/${deviceId}`,
                        width: WIDTH,
                        height: HEIGHT,
                        origin,
                    });

                    // Upload PNG to Convex storage
                    const uploadUrl = await convexAdmin.mutation(
                        internal.applications.plugin.data.generateRenderUploadUrl,
                        {},
                    );
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'image/png' },
                        body: png,
                    });
                    const { storageId } = await uploadRes.json();

                    // Set as device.next
                    await convexAdmin.mutation(internal.applications.plugin.data.setDeviceNext, {
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
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        const message = error instanceof Error ? error.message : 'Internal Server Error';

        if (message.includes('not found') || message.includes('not active')) {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        console.error('Plugin data error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
