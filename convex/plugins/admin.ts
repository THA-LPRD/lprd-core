import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { pluginScope, pluginTopic } from '../schema';
import { getCurrentUser } from '../users';
import { getPermissions } from '../lib/acl';

const MAX_KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a short alphanumeric registration key (16 chars, ~95 bits of entropy).
 */
function generateRegistrationKey(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * Create a pending plugin slot with a plaintext registration key.
 * AppAdmin only. Key is stored plaintext (burned on use) with an expiry.
 */
export const createPluginSlot = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        scopes: v.optional(v.array(pluginScope)),
        keyTtlMs: v.number(), // how long the registration key is valid (capped at 24h)
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) throw new Error('Not authorized');

        const ttl = Math.min(Math.max(args.keyTtlMs, 60_000), MAX_KEY_TTL_MS); // min 1 min, max 24h
        const registrationKey = generateRegistrationKey();

        const now = Date.now();
        const pluginId = await ctx.db.insert('plugins', {
            name: args.name,
            type: 'external',
            version: '0.0.0',
            description: args.description,
            status: 'pending',
            baseUrl: '',
            topics: [],
            healthCheckIntervalMs: 30_000,
            registrationKey,
            registrationKeyExpiresAt: now + ttl,
            scopes: args.scopes,
            createdBy: user._id,
            createdAt: now,
            updatedAt: now,
        });

        return { pluginId, registrationKey };
    },
});

/**
 * List all external plugins regardless of status. AppAdmin only.
 * System plugins (type: 'system') are excluded — they're built-in.
 */
export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) return [];

        const plugins = await ctx.db.query('plugins').collect();
        return plugins.filter((p) => p.type !== 'system');
    },
});

/**
 * Get full plugin details. AppAdmin only.
 */
export const getDetails = query({
    args: { id: v.id('plugins') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) return null;

        return ctx.db.get(args.id);
    },
});

/**
 * Update plugin status (suspend/activate/remove). AppAdmin only.
 */
export const updateStatus = mutation({
    args: {
        id: v.id('plugins'),
        status: v.union(v.literal('active'), v.literal('suspended'), v.literal('removed')),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) throw new Error('Not authorized');

        const plugin = await ctx.db.get(args.id);
        if (!plugin) throw new Error('Plugin not found');

        await ctx.db.patch(args.id, {
            status: args.status,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Complete plugin registration. Burns the registration key, sets status active.
 * Called from the Next.js registration API route.
 */
export const completeRegistration = internalMutation({
    args: {
        pluginId: v.id('plugins'),
        version: v.string(),
        baseUrl: v.string(),
        topics: v.array(pluginTopic),
        description: v.optional(v.string()),
        configSchema: v.optional(v.any()),
        tokenIssuedAt: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.pluginId, {
            version: args.version,
            baseUrl: args.baseUrl,
            topics: args.topics,
            description: args.description,
            configSchema: args.configSchema,
            status: 'active',
            registrationKey: undefined,
            tokenIssuedAt: args.tokenIssuedAt,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Find a pending plugin by plaintext registration key. Checks expiry.
 */
export const validateRegistrationKey = internalQuery({
    args: { registrationKey: v.string() },
    handler: async (ctx, args) => {
        const plugin = await ctx.db
            .query('plugins')
            .withIndex('by_registrationKey', (q) => q.eq('registrationKey', args.registrationKey))
            .first();

        if (!plugin) return null;
        if (plugin.registrationKeyExpiresAt && Date.now() > plugin.registrationKeyExpiresAt) return null;

        return plugin;
    },
});

/**
 * Update tokenIssuedAt for token reissuance. Called from reissue API route.
 */
export const updateTokenIssuedAt = internalMutation({
    args: {
        pluginId: v.id('plugins'),
        tokenIssuedAt: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.pluginId, {
            tokenIssuedAt: args.tokenIssuedAt,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Reissue token — appAdmin only. Updates tokenIssuedAt to invalidate old tokens.
 * JWT signing happens in the API route.
 */
export const reissueToken = mutation({
    args: { pluginId: v.id('plugins') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        const perms = getPermissions(user, null);
        if (!perms.plugin.manage) throw new Error('Not authorized');

        const plugin = await ctx.db.get(args.pluginId);
        if (!plugin) throw new Error('Plugin not found');

        const tokenIssuedAt = Math.floor(Date.now() / 1000);
        await ctx.db.patch(args.pluginId, {
            tokenIssuedAt,
            updatedAt: Date.now(),
        });

        return { tokenIssuedAt };
    },
});
