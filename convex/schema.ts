import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { permissionValues } from './lib/permissions';

// Platform-level role
export const actorRole = v.union(v.literal('appAdmin'), v.literal('user'));

// Actor type
export const actorType = v.union(v.literal('user'), v.literal('serviceAccount'));

// Shared actor status
export const actorStatus = v.union(v.literal('active'), v.literal('inactive'));

// Human site-actor role
export const siteActorRole = v.union(v.literal('siteAdmin'), v.literal('user'));

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

// Application type
export const applicationType = v.union(v.literal('plugin'), v.literal('internal'));

// Application status
export const applicationStatus = v.union(
    v.literal('pending'),
    v.literal('active'),
    v.literal('inactive'),
    v.literal('suspended'),
    v.literal('removed'),
);

// `v.union(...)` needs a non-empty tuple of literal validators, but `.map(...)`
// erases the tuple shape from `permissionValues`, so we cast it back here.
const applicationPermissionLiterals = permissionValues.map((permission) => v.literal(permission)) as unknown as [
    ReturnType<typeof v.literal>,
    ReturnType<typeof v.literal>,
    ...ReturnType<typeof v.literal>[],
];

// Canonical permission validator derived from the shared permission catalog.
export const applicationPermission = v.union(...applicationPermissionLiterals);

export const permissionGrantTargetType = v.union(
    v.literal('actor'),
    v.literal('platform'),
    v.literal('organization'),
    v.literal('site'),
);

export const permissionGrantSubjectType = v.union(v.literal('actor'), v.literal('organization'), v.literal('site'));

export const permissionGrantSource = v.union(
    v.literal('actorRole'),
    v.literal('siteActor'),
    v.literal('application'),
    v.literal('manual'),
);

// Health check status (individual check result)
export const healthCheckStatus = v.union(v.literal('healthy'), v.literal('unhealthy'), v.literal('error'));

// Background job status
export const jobStatus = v.union(
    v.literal('pending'),
    v.literal('paused'),
    v.literal('running'),
    v.literal('succeeded'),
    v.literal('failed'),
    v.literal('cancelled'),
);

// Background job type
export const jobType = v.union(
    v.literal('normalize-images'),
    v.literal('template-thumbnail'),
    v.literal('frame-thumbnail'),
    v.literal('device-render'),
    v.literal('health-check'),
);

// Resource type associated with a job
export const jobResourceType = v.union(
    v.literal('pluginData'),
    v.literal('template'),
    v.literal('frame'),
    v.literal('device'),
    v.literal('application'),
);

export const siteJobResourceType = v.union(
    v.literal('template'),
    v.literal('frame'),
    v.literal('device'),
    v.literal('pluginData'),
);

// Source that requested a job
export const jobSource = v.union(
    v.literal('pluginPush'),
    v.literal('manualSave'),
    v.literal('templateSave'),
    v.literal('templateCreate'),
    v.literal('templateDuplicate'),
    v.literal('frameSave'),
    v.literal('deviceConfigure'),
    v.literal('pluginTemplateUpsert'),
    v.literal('scheduler'),
);

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

// Template attachment scope.
export const templateScope = v.union(v.literal('organization'), v.literal('site'));

// Plugin topic
export const pluginTopic = v.object({
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
});

// Device data binding
export const deviceDataBinding = v.object({
    widgetId: v.string(),
    applicationId: v.id('applications'),
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

export const latestJobState = v.object({
    status: jobStatus,
    updatedAt: v.number(),
    errorMessage: v.optional(v.string()),
    jobId: v.optional(v.id('jobs')),
});

export default defineSchema({
    actors: defineTable({
        publicId: v.string(),
        type: actorType,
        organizationId: v.optional(v.id('organizations')),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        avatarStorageId: v.optional(v.id('_storage')),
        status: actorStatus,
        role: actorRole,
        lastSiteSlug: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_publicId', ['publicId'])
        .index('by_email', ['email'])
        .index('by_organization', ['organizationId']),

    organizations: defineTable({
        name: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }),

    sites: defineTable({
        publicId: v.string(),
        organizationId: v.id('organizations'),
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_publicId', ['publicId'])
        .index('by_slug', ['slug'])
        .index('by_organization', ['organizationId']),

    siteActors: defineTable({
        actorId: v.id('actors'),
        siteId: v.id('sites'),
        role: v.optional(siteActorRole),
        createdAt: v.number(),
    })
        .index('by_actor', ['actorId'])
        .index('by_site', ['siteId'])
        .index('by_actor_and_site', ['actorId', 'siteId']),

    devices: defineTable({
        siteId: v.id('sites'),
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
        latestJob: v.optional(latestJobState),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_site', ['siteId'])
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

    applications: defineTable({
        actorId: v.id('actors'),
        name: v.string(),
        description: v.optional(v.string()),
        type: applicationType,
        status: applicationStatus,
        organizationId: v.optional(v.id('organizations')),
        workosApplicationId: v.string(),
        workosClientId: v.string(),
        lastSecretHint: v.optional(v.string()),
        createdBy: v.optional(v.id('actors')),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_status', ['status'])
        .index('by_actor', ['actorId'])
        .index('by_workosApplicationId', ['workosApplicationId'])
        .index('by_workosClientId', ['workosClientId'])
        .index('by_organization', ['organizationId'])
        .index('by_type', ['type']),

    permissionGrants: defineTable({
        subjectType: permissionGrantSubjectType,
        subjectId: v.union(v.id('actors'), v.id('organizations'), v.id('sites')),
        permission: v.string(),
        targetType: permissionGrantTargetType,
        targetId: v.union(v.id('actors'), v.id('organizations'), v.id('sites'), v.null()),
        source: permissionGrantSource,
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_subject', ['subjectType', 'subjectId'])
        .index('by_subject_and_source', ['subjectType', 'subjectId', 'source'])
        .index('by_subject_and_target', ['subjectType', 'subjectId', 'targetType', 'targetId'])
        .index('by_target', ['targetType', 'targetId']),

    pluginProfiles: defineTable({
        applicationId: v.id('applications'),
        baseUrl: v.string(),
        version: v.string(),
        topics: v.array(pluginTopic),
        configSchema: v.optional(v.any()),
        healthCheckIntervalMs: v.number(), // minimum 30000 (30s)
        lastHealthCheckAt: v.optional(v.number()),
        healthStatus: v.optional(pluginHealthStatus), // derived from recent checks
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_application', ['applicationId']),

    pluginHealthChecks: defineTable({
        applicationId: v.id('applications'),
        status: healthCheckStatus,
        responseTimeMs: v.optional(v.number()),
        pluginVersion: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        checkedAt: v.number(),
    })
        .index('by_application', ['applicationId'])
        .index('by_application_and_time', ['applicationId', 'checkedAt']),

    pluginData: defineTable({
        applicationId: v.id('applications'),
        siteId: v.id('sites'),
        topic: v.string(),
        entry: v.string(),
        contentType: v.string(),
        data: v.any(),
        ttlSeconds: v.number(),
        expiresAt: v.number(),
        receivedAt: v.number(),
        latestJob: v.optional(latestJobState),
    })
        .index('by_application', ['applicationId'])
        .index('by_site', ['siteId'])
        .index('by_application_and_site', ['applicationId', 'siteId'])
        .index('by_application_and_time', ['applicationId', 'receivedAt'])
        .index('by_expiry', ['expiresAt'])
        .index('by_application_site_topic_entry', ['applicationId', 'siteId', 'topic', 'entry']),

    templates: defineTable({
        // Scope & ownership
        scope: templateScope,
        organizationId: v.id('organizations'),
        applicationId: v.optional(v.id('applications')),
        siteId: v.optional(v.id('sites')),
        createdBy: v.optional(v.id('actors')),

        // Content
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),

        // Variants & preferred
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
        thumbnailStorageId: v.optional(v.id('_storage')),
        latestJob: v.optional(latestJobState),

        // Metadata
        version: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_scope', ['scope'])
        .index('by_site', ['siteId'])
        .index('by_organization_and_scope', ['organizationId', 'scope'])
        .index('by_application', ['applicationId'])
        .index('by_application_and_name', ['applicationId', 'name']),

    frames: defineTable({
        siteId: v.id('sites'),
        createdBy: v.id('actors'),
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
        latestJob: v.optional(latestJobState),

        createdAt: v.number(),
        updatedAt: v.number(),
    }).index('by_site', ['siteId']),

    jobs: defineTable({
        siteId: v.optional(v.id('sites')),
        actorId: v.id('actors'),
        type: jobType,
        resourceType: jobResourceType,
        resourceId: v.string(),
        source: jobSource,
        status: jobStatus,
        dedupeKey: v.string(),
        attempts: v.number(),
        errorMessage: v.optional(v.string()),
        payload: v.any(),
        createdAt: v.number(),
        startedAt: v.optional(v.number()),
        finishedAt: v.optional(v.number()),
    })
        .index('by_site', ['siteId'])
        .index('by_site_and_createdAt', ['siteId', 'createdAt'])
        .index('by_site_and_resourceType_and_createdAt', ['siteId', 'resourceType', 'createdAt'])
        .index('by_dedupeKey', ['dedupeKey'])
        .index('by_resource', ['resourceType', 'resourceId'])
        .index('by_status', ['status']),
});
