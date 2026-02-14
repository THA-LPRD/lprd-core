import {v} from 'convex/values';
import {internalMutation, internalQuery} from './_generated/server';
import {healthCheckStatus} from './schema';

/**
 * Get a plugin by its UUID string.
 * Used by httpAction endpoints that receive plugin ID from headers.
 */
export const getByUuid = internalQuery({
	args: {uuid: v.string()},
	handler: async (ctx, args) => {
		return ctx.db
			.query('plugins')
			.withIndex('by_plugin_id', (q) => q.eq('id', args.uuid))
			.unique();
	},
});

const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * Register a new plugin. Called from the /api/v2/plugin/register httpAction.
 * Generates a UUID and inserts with status 'pending'.
 */
export const registerPlugin = internalMutation({
	args: {
		id: v.string(),
		name: v.string(),
		version: v.string(),
		description: v.optional(v.string()),
		configSchema: v.optional(v.any()),
		baseUrl: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if a plugin with this base URL already exists
		const existing = await ctx.db
			.query('plugins')
			.filter((q) => q.eq(q.field('baseUrl'), args.baseUrl))
			.first();

		if (existing) return {pluginId: existing._id, id: existing.id, alreadyExists: true};

		const now = Date.now();
		const pluginId = await ctx.db.insert('plugins', {
			id: args.id,
			name: args.name,
			version: args.version,
			description: args.description,
			configSchema: args.configSchema,
			status: 'pending',
			baseUrl: args.baseUrl,
			healthCheckIntervalMs: DEFAULT_HEALTH_CHECK_INTERVAL_MS,
			createdAt: now,
			updatedAt: now,
		});

		return {pluginId, id: args.id, alreadyExists: false};
	},
});

/**
 * Store data pushed by a plugin via webhook.
 * Validates the plugin exists and is active.
 */
export const storeWebhookData = internalMutation({
	args: {
		pluginUuid: v.string(),
		orgSlug: v.string(),
		contentType: v.string(),
		data: v.any(),
		ttlSeconds: v.number(),
	},
	handler: async (ctx, args) => {
		const plugin = await ctx.db
			.query('plugins')
			.withIndex('by_plugin_id', (q) => q.eq('id', args.pluginUuid))
			.unique();

		if (!plugin) throw new Error('Plugin not found');
		if (plugin.status !== 'active') throw new Error(`Plugin is not active (status: ${plugin.status})`);

		const org = await ctx.db
			.query('organizations')
			.withIndex('by_slug', (q) => q.eq('slug', args.orgSlug))
			.unique();

		if (!org) throw new Error(`Organization not found: ${args.orgSlug}`);

		const now = Date.now();
		await ctx.db.insert('pluginData', {
			pluginId: plugin._id,
			organizationId: org._id,
			contentType: args.contentType,
			data: args.data,
			ttlSeconds: args.ttlSeconds,
			expiresAt: now + args.ttlSeconds * 1000,
			receivedAt: now,
		});
	},
});

/**
 * List active plugins that are overdue for a health check.
 * Called by the worker scheduler on a Xs interval.
 */
export const listDueForHealthCheck = internalQuery({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const activePlugins = await ctx.db
			.query('plugins')
			.withIndex('by_status', (q) => q.eq('status', 'active'))
			.collect();

		return activePlugins
			.filter((p) => now - (p.lastHealthCheckAt ?? 0) >= p.healthCheckIntervalMs)
			.map((p) => ({
				_id: p._id,
				id: p.id,
				baseUrl: p.baseUrl,
				healthCheckIntervalMs: p.healthCheckIntervalMs,
				lastHealthCheckAt: p.lastHealthCheckAt,
			}));
	},
});

/**
 * Record a health check result and update the plugin's lastHealthCheckAt.
 * Called by the worker after checking a plugin's /health endpoint.
 */
export const recordHealthCheck = internalMutation({
	args: {
		pluginId: v.id('plugins'),
		status: healthCheckStatus,
		responseTimeMs: v.optional(v.number()),
		pluginVersion: v.optional(v.string()),
		errorMessage: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		await ctx.db.insert('pluginHealthChecks', {
			pluginId: args.pluginId,
			status: args.status,
			responseTimeMs: args.responseTimeMs,
			pluginVersion: args.pluginVersion,
			errorMessage: args.errorMessage,
			checkedAt: now,
		});

		await ctx.db.patch(args.pluginId, {
			lastHealthCheckAt: now,
			updatedAt: now,
		});
	},
});