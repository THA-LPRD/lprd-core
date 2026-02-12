import {httpAction} from '../_generated/server';
import {internal} from '../_generated/api';

/**
 * POST /api/v2/plugin/webhook/:pluginId
 * Receives data pushed by a plugin. Returns 202.
 */
export const handlePluginWebhook = httpAction(async (ctx, request) => {
	try {
		// Extract plugin ID from URL path
		const url = new URL(request.url);
		const segments = url.pathname.split('/');
		const pluginUuid = segments[segments.length - 1];

		if (!pluginUuid) {
			return new Response(
				JSON.stringify({error: 'Plugin ID is required in URL path'}),
				{status: 400, headers: {'Content-Type': 'application/json'}},
			);
		}

		const body = await request.json();
		const {content_type, data, ttl_seconds, org_slug} = body;

		if (!content_type || data === undefined || !ttl_seconds || !org_slug) {
			return new Response(
				JSON.stringify({error: 'content_type, data, ttl_seconds, and org_slug are required'}),
				{status: 400, headers: {'Content-Type': 'application/json'}},
			);
		}

		await ctx.runMutation(internal.plugins.storeWebhookData, {
			pluginUuid,
			orgSlug: org_slug,
			contentType: content_type,
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

		console.error('Plugin webhook error:', error);
		return new Response(
			JSON.stringify({error: 'Internal Server Error'}),
			{status: 500, headers: {'Content-Type': 'application/json'}},
		);
	}
});