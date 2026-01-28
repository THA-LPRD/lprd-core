import {WorkOS} from '@workos-inc/node';
import type {ActionCtx} from './_generated/server';
import {httpAction, internalAction} from './_generated/server';
import {internal} from './_generated/api';
import {v} from 'convex/values';

/**
 * Helper function to verify webhook signature and parse payload
 */
async function verifyAndParse(request: Request, ctx: ActionCtx, secretEnvVar: string) {
	const bodyText = await request.text();
	const sigHeader = String(request.headers.get('workos-signature'));

	// Verify signature with event-specific secret
	try {
		await ctx.runAction(internal.workos.verifyWebhook, {
			payload: bodyText,
			signature: sigHeader,
			secret: secretEnvVar,
		});
	} catch (error) {
		throw new Error('Unauthorized');
	}

	return JSON.parse(bodyText);
}

/**
 * Internal action to verify WorkOS webhook signature
 */
export const verifyWebhook = internalAction({
	args: {
		payload: v.string(),
		signature: v.string(),
		secret: v.string(),
	},
	handler: async (ctx, args) => {
		const workos = new WorkOS(process.env.WORKOS_API_KEY);

		const webhook = workos.webhooks.constructEvent({
			payload: JSON.parse(args.payload),
			sigHeader: args.signature,
			secret: args.secret,
		});

		return webhook;
	},
});

/**
 * Webhook handler for user.created events
 */
export const handleUserCreated = httpAction(async (ctx, request) => {
	try {
		const event = await verifyAndParse(
			request,
			ctx,
			process.env.WORKOS_WEBHOOK_USERS_CREATED_SECRET!,
		);
		const {data} = event;

		await ctx.runMutation(internal.users.createFromWebhook, {
			authId: data.id,
			email: data.email,
			name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
			avatarUrl: data.profile_picture_url || undefined,
		});

		return new Response(null, {status: 200});
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			return new Response('Unauthorized', {status: 401});
		}
		console.error('Webhook processing error:', error);
		return new Response('Internal Server Error', {status: 500});
	}
});

/**
 * Webhook handler for user.updated events
 */
export const handleUserUpdated = httpAction(async (ctx, request) => {
	try {
		const event = await verifyAndParse(
			request,
			ctx,
			process.env.WORKOS_WEBHOOK_USERS_UPDATED_SECRET!,
		);
		const {data} = event;

		await ctx.runMutation(internal.users.updateFromWebhook, {
			authId: data.id,
			email: data.email,
			name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
			avatarUrl: data.profile_picture_url || undefined,
		});

		return new Response(null, {status: 200});
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			return new Response('Unauthorized', {status: 401});
		}
		console.error('Webhook processing error:', error);
		return new Response('Internal Server Error', {status: 500});
	}
});

/**
 * Webhook handler for user.deleted events
 */
export const handleUserDeleted = httpAction(async (ctx, request) => {
	try {
		const event = await verifyAndParse(
			request,
			ctx,
			process.env.WORKOS_WEBHOOK_USERS_DELETED_SECRET!,
		);
		const {data} = event;

		await ctx.runMutation(internal.users.deleteFromWebhook, {
			authId: data.id,
		});

		return new Response(null, {status: 200});
	} catch (error) {
		if (error instanceof Error && error.message === 'Unauthorized') {
			return new Response('Unauthorized', {status: 401});
		}
		console.error('Webhook processing error:', error);
		return new Response('Internal Server Error', {status: 500});
	}
});