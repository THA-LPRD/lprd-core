import {defineSchema, defineTable} from 'convex/server';
import {v} from 'convex/values';

// Platform-level role
export const userRole = v.union(v.literal('appAdmin'), v.literal('user'));

// Organization-level role
export const orgMemberRole = v.union(v.literal('orgAdmin'), v.literal('user'));

// Device status
export const deviceStatus = v.union(v.literal('pending'), v.literal('active'));

// Plugin status
export const pluginStatus = v.union(
    v.literal('pending'),
    v.literal('approved'),
    v.literal('active'),
    v.literal('inactive'),
    v.literal('suspended'),
    v.literal('removed'),
);

// Health check status
export const healthCheckStatus = v.union(
    v.literal('healthy'),
    v.literal('unhealthy'),
    v.literal('error'),
);

export default defineSchema({
    users: defineTable({
        authId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatarStorageId: v.optional(v.id('_storage')),
        role: userRole,
        lastOrgSlug: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_authId', ['authId'])
        .index('by_email', ['email']),

    organizations: defineTable({
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_slug', ['slug']),

    organizationMembers: defineTable({
        userId: v.id('users'),
        organizationId: v.id('organizations'),
        role: orgMemberRole,
        createdAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_user_and_org', ['userId', 'organizationId']),

    devices: defineTable({
        id: v.string(), // UUIDv4
        organizationId: v.id('organizations'),
        name: v.string(),
        description: v.optional(v.string()),
        tags: v.array(v.string()),
        status: deviceStatus,
        lastSeen: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_device_id', ['id'])
        .index('by_organization', ['organizationId']),

    plugins: defineTable({
        id: v.string(), // UUIDv4
        name: v.string(),
        version: v.string(),
        description: v.optional(v.string()),
        configSchema: v.optional(v.any()),
        status: pluginStatus,
        baseUrl: v.string(),
        healthCheckIntervalMs: v.number(), // minimum 30000 (30s)
        lastHealthCheckAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_plugin_id', ['id'])
        .index('by_status', ['status']),

    pluginHealthChecks: defineTable({
        pluginId: v.id('plugins'),
        status: healthCheckStatus,
        responseTimeMs: v.optional(v.number()),
        pluginVersion: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        checkedAt: v.number(),
    })
        .index('by_plugin', ['pluginId'])
        .index('by_plugin_and_time', ['pluginId', 'checkedAt']),

    pluginData: defineTable({
        pluginId: v.id('plugins'),
        organizationId: v.id('organizations'),
        contentType: v.string(),
        data: v.any(),
        ttlSeconds: v.number(),
        expiresAt: v.number(),
        receivedAt: v.number(),
    })
        .index('by_plugin', ['pluginId'])
        .index('by_organization', ['organizationId'])
        .index('by_plugin_and_org', ['pluginId', 'organizationId'])
        .index('by_plugin_and_time', ['pluginId', 'receivedAt'])
        .index('by_expiry', ['expiresAt']),
});