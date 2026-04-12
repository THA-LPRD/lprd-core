import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { recordAndEnqueueJob } from '@/lib/jobs/dispatch';
import { permissionCatalog } from '@/lib/permissions';

/**
 * POST /api/v2/plugin/webhook/data
 * Receives data pushed by a plugin, stores it in Convex,
 * then queues any normalization/render work for the worker.
 * Authenticated via Bearer JWT token.
 */
export async function POST(request: Request) {
    try {
        const authorization = await requirePermission(permissionCatalog.org.site.pluginData.manage.self, { request });
        if (!authorization.application) {
            throw new AuthError('Application not found', 401);
        }
        if (authorization.application.type !== 'plugin') {
            throw new AuthError(`Application type '${authorization.application.type}' is not allowed here`, 403);
        }

        const token = authorization.accessToken;
        const body = await request.json();
        const { data, ttl_seconds, site_id, topic, entry } = body;

        if (data === undefined || typeof ttl_seconds !== 'number' || ttl_seconds < 0 || !site_id || !topic || !entry) {
            return NextResponse.json(
                { error: 'data, non-negative ttl_seconds, site_id, topic, and entry are required' },
                { status: 400 },
            );
        }

        const hasAccess = await fetchQuery(
            api.siteActors.checkMySiteAccessByPublicId,
            { sitePublicId: site_id },
            { token },
        );
        if (!hasAccess) {
            throw new AuthError('Application is not installed on this site', 403);
        }

        // Store the data in Convex
        const result = await fetchMutation(
            api.applications.plugin.data.storeWebhookDataForApplication,
            {
                sitePublicId: site_id,
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
                actorId: authorization.actor._id,
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
                        actorId: authorization.actor._id,
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
                        actorId: authorization.actor._id,
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
