import {httpAction} from '../_generated/server';
import {internal} from '../_generated/api';

/**
 * POST /api/v2/plugin/webhook/data
 * Receives data pushed by a plugin. Plugin ID is read from the X-Plugin-Id header.
 * Returns 202.
 */
export const handlePluginData = httpAction(async (ctx, request) => {
	try {
		const pluginUuid = request.headers.get('X-Plugin-Id');
		if (!pluginUuid) {
			return new Response(
				JSON.stringify({error: 'X-Plugin-Id header is required'}),
				{status: 400, headers: {'Content-Type': 'application/json'}},
			);
		}

		const body = await request.json();
		const {data, ttl_seconds, org_slug} = body;

		if (data === undefined || !ttl_seconds || !org_slug) {
			return new Response(
				JSON.stringify({error: 'data, ttl_seconds, and org_slug are required'}),
				{status: 400, headers: {'Content-Type': 'application/json'}},
			);
		}

		await ctx.runMutation(internal.plugins.storeWebhookData, {
			pluginUuid,
			orgSlug: org_slug,
			contentType: 'plugin_data',
			data,
			ttlSeconds: ttl_seconds,
		});

		return new Response(null, {status: 202});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Internal Server Error';

		if (message.includes('not found') || message.includes('not active')) {
			return new Response(
				JSON.stringify({error: message}),
				{status: 404, headers: {'Content-Type': 'application/json'}},
			);
		}

		console.error('Plugin data error:', error);
		return new Response(
			JSON.stringify({error: 'Internal Server Error'}),
			{status: 500, headers: {'Content-Type': 'application/json'}},
		);
	}
});
