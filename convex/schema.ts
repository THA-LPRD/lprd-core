import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Platform-level role
export const userRole = v.union(v.literal('appAdmin'), v.literal('user'));

// Organization-level role
export const orgMemberRole = v.union(v.literal('orgAdmin'), v.literal('user'));

// Device status
export const deviceStatus = v.union(v.literal('pending'), v.literal('active'));

// Device access log type
export const deviceLogType = v.union(v.literal('existence_check'), v.literal('config_fetch'), v.literal('image_fetch'));

// Device access log status
export const deviceLogStatus = v.union(
    v.literal('ok'),
    v.literal('no_content'),
    v.literal('unauthorized'),
    v.literal('not_found'),
    v.literal('error'),
);

// Device API version
export const deviceApiVersion = v.union(v.literal('v1'), v.literal('v2'));

// Plugin type
export const pluginType = v.union(v.literal('external'), v.literal('system'));

// Plugin status
export const pluginStatus = v.union(
    v.literal('pending'),
    v.literal('approved'),
    v.literal('active'),
    v.literal('inactive'),
    v.literal('suspended'),
    v.literal('removed'),
);

// Plugin scope (allowed actions)
export const pluginScope = v.union(v.literal('push_data'), v.literal('create_template'));

// Health check status (individual check result)
export const healthCheckStatus = v.union(v.literal('healthy'), v.literal('unhealthy'), v.literal('error'));

// Plugin health status (derived from recent checks)
export const pluginHealthStatus = v.union(
    v.literal('unknown'), // no checks yet
    v.literal('healthy'), // last check healthy
    v.literal('degraded'), // 1-2 consecutive failures
    v.literal('unhealthy'), // 3+ consecutive failures
);

// Template variant
export const templateVariant = v.union(
    v.object({ type: v.literal('content'), w: v.number(), h: v.number() }),
    v.object({ type: v.literal('background') }),
    v.object({ type: v.literal('foreground') }),
);

// Template scope
export const templateScope = v.union(v.literal('global'), v.literal('org'));

// Plugin topic
export const pluginTopic = v.object({
    id: v.string(),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
});

// Device data binding
export const deviceDataBinding = v.object({
    widgetId: v.string(),
    pluginId: v.id('plugins'),
    topic: v.string(),
    entry: v.string(),
});

// Device render reference
export const deviceRender = v.object({
    storageId: v.id('_storage'),
    renderedAt: v.number(),
});

// Widget placed on a frame grid
export const frameWidget = v.object({
    id: v.string(),
    templateId: v.optional(v.id('templates')),
    variantIndex: v.optional(v.number()),
    x: v.number(),
    y: v.number(),
    w: v.number(),
    h: v.number(),
});

// Reference to a template used as background/foreground layer
export const frameLayer = v.object({
    templateId: v.id('templates'),
    variantIndex: v.number(),
});

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
        organizationId: v.id('organizations'),
        name: v.string(),
        macAddress: v.optional(v.string()),
        apiVersion: v.optional(deviceApiVersion),
        description: v.optional(v.string()),
        tags: v.array(v.string()),
        status: deviceStatus,
        lastSeen: v.optional(v.number()),
        frameId: v.optional(v.id('frames')),
        dataBindings: v.optional(v.array(deviceDataBinding)),
        last: v.optional(deviceRender),
        current: v.optional(deviceRender),
        next: v.optional(deviceRender),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_organization', ['organizationId'])
        .index('by_mac_address', ['macAddress']),

    deviceAccessLogs: defineTable({
        deviceId: v.id('devices'),
        macAddress: v.string(),
        type: deviceLogType,
        ipAddress: v.optional(v.string()),
        responseStatus: deviceLogStatus,
        imageChanged: v.boolean(),
        accessedAt: v.number(),
    })
        .index('by_device', ['deviceId'])
        .index('by_device_and_time', ['deviceId', 'accessedAt'])
        .index('by_mac', ['macAddress']),

    deviceDataSnapshots: defineTable({
        deviceId: v.id('devices'),
        logId: v.id('deviceAccessLogs'),
        data: v.any(),
        createdAt: v.number(),
    })
        .index('by_device', ['deviceId'])
        .index('by_log', ['logId']),

    plugins: defineTable({
        name: v.string(),
        type: pluginType, // 'external' or 'system'
        version: v.string(),
        description: v.optional(v.string()),
        configSchema: v.optional(v.any()),
        status: pluginStatus,
        baseUrl: v.string(),
        topics: v.array(pluginTopic),
        healthCheckIntervalMs: v.number(), // minimum 30000 (30s)
        lastHealthCheckAt: v.optional(v.number()),
        healthStatus: v.optional(pluginHealthStatus), // derived from recent checks
        // Auth fields
        registrationKey: v.optional(v.string()), // plaintext one-time key, present while pending
        registrationKeyExpiresAt: v.optional(v.number()), // expiry timestamp for the registration key
        tokenIssuedAt: v.optional(v.number()), // for token revocation
        scopes: v.optional(v.array(pluginScope)), // allowed actions
        createdBy: v.optional(v.id('users')), // appAdmin who created the slot
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_status', ['status'])
        .index('by_registrationKey', ['registrationKey']),

    pluginOrgAccess: defineTable({
        pluginId: v.id('plugins'),
        organizationId: v.id('organizations'),
        enabledByAdmin: v.boolean(), // appAdmin per-org control (default true)
        enabledByOrg: v.boolean(), // orgAdmin choice (default false — opt-in)
        updatedByAdmin: v.optional(v.id('users')),
        updatedByOrg: v.optional(v.id('users')),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_plugin', ['pluginId'])
        .index('by_organization', ['organizationId'])
        .index('by_plugin_and_org', ['pluginId', 'organizationId']),

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
        topic: v.string(),
        entry: v.string(),
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
        .index('by_expiry', ['expiresAt'])
        .index('by_plugin_org_topic_entry', ['pluginId', 'organizationId', 'topic', 'entry']),

    templates: defineTable({
        // Ownership
        scope: templateScope,
        pluginId: v.optional(v.id('plugins')),
        organizationId: v.optional(v.id('organizations')),
        createdBy: v.optional(v.id('users')),

        // Content
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),

        // Variants & preferred
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
        thumbnailStorageId: v.optional(v.id('_storage')),

        // Metadata
        version: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_scope', ['scope'])
        .index('by_organization', ['organizationId'])
        .index('by_plugin', ['pluginId'])
        .index('by_plugin_and_name', ['pluginId', 'name']),

    frames: defineTable({
        organizationId: v.id('organizations'),
        createdBy: v.id('users'),
        name: v.string(),
        description: v.optional(v.string()),

        // Layers
        background: v.optional(frameLayer),
        backgroundColor: v.optional(v.string()),
        foreground: v.optional(frameLayer),

        // Content grid (always 10×6, each cell 80px for preview)
        widgets: v.array(frameWidget),

        // Thumbnail
        thumbnailStorageId: v.optional(v.id('_storage')),

        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_organization', ['organizationId']),
});
