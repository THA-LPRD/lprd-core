import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { authenticatePlugin, AuthError, requireScope, requireSiteAccess } from '@/lib/application/auth';
import { recordAndEnqueueJob } from '@/lib/worker-jobs';

/**
 * POST /api/v2/plugin/webhook/data
 * Receives data pushed by a plugin, stores it in Convex,
 * then queues any normalization/render work for the worker.
 * Authenticated via Bearer JWT token.
 */
export async function POST(request: Request) {
    try {
        // Authenticate plugin via JWT
        const plugin = await authenticatePlugin(request);
        requireScope(plugin, 'push_data');

        const token = request.headers.get('authorization')!.slice(7);
        const body = await request.json();
        const { data, ttl_seconds, org_slug, topic, entry } = body;

        if (data === undefined || !ttl_seconds || !org_slug || !topic || !entry) {
            return NextResponse.json(
                { error: 'data, ttl_seconds, org_slug, topic, and entry are required' },
                { status: 400 },
            );
        }

        // Check site access (plugin active + enabledByAdmin + enabledByOrg)
        await requireSiteAccess(token, org_slug);

        // Store the data in Convex
        const result = await fetchMutation(
            api.applications.plugin.data.storeWebhookDataForApplication,
            {
                pluginId: plugin._id,
                siteSlug: org_slug,
                contentType: 'plugin_data',
                data,
                ttlSeconds: ttl_seconds,
                topic,
                entry,
            },
            { token },
        );

        // Find affected devices
        const affectedDevices = await fetchQuery(
            api.applications.plugin.data.listAffectedDevicesForJob,
            {
                pluginId: result.pluginId,
                siteId: result.siteId,
                topic,
                entry,
            },
            { token },
        );

        const nextJobs = affectedDevices.map((device) => ({
            type: 'device-render' as const,
            payload: {
                deviceId: device.deviceId,
                siteId: device.siteId,
                siteSlug: result.siteSlug,
            },
        }));

        if (result.needsNormalization) {
            await recordAndEnqueueJob({
                token,
                actorId: plugin.actorId,
                siteId: result.siteId,
                type: 'normalize-images',
                resourceType: 'pluginData',
                resourceId: result.pluginDataId,
                source: 'pluginPush',
                payload: {
                    type: 'normalize-images',
                    payload: {
                        resourceType: 'pluginData',
                        resourceId: result.pluginDataId,
                        actorId: plugin.actorId,
                        siteId: result.siteId,
                        source: 'pluginPush',
                        nextJobs,
                    },
                },
            });
        } else {
            await Promise.all(
                nextJobs.map((job) =>
                    recordAndEnqueueJob({
                        token,
                        actorId: plugin.actorId,
                        siteId: result.siteId,
                        type: job.type,
                        resourceType: 'device',
                        resourceId: job.payload.deviceId,
                        source: 'pluginPush',
                        payload: job,
                    }),
                ),
            );
        }

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
