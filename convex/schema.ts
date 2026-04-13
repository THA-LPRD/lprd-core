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

export const systemMessageType = v.union(v.literal('siteInvite'));

export const systemMessageFolder = v.union(v.literal('inbox'), v.literal('archive'), v.literal('deleted'));

export const siteInviteStatus = v.union(
    v.literal('pending'),
    v.literal('accepted'),
    v.literal('declined'),
    v.literal('revoked'),
    v.literal('expired'),
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

export const deviceOffHoursWindow = v.object({
    days: v.array(v.number()),
    startMinute: v.number(),
    endMinute: v.number(),
});

export const deviceWakePolicy = v.object({
    staleDataRetrySeconds: v.number(),
    missingDataRetrySeconds: v.number(),
    unboundRefreshSeconds: v.number(),
    maxFreshDataSleepSeconds: v.number(),
    offHoursEnabled: v.boolean(),
    offHoursTimezone: v.string(),
    offHoursWindows: v.array(deviceOffHoursWindow),
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
    jobId: v.optional(v.id('jobLogs')),
    jobStateId: v.optional(v.id('jobStates')),
    executionId: v.optional(v.id('jobLogs')),
});

export default defineSchema({
    siteAssets: defineTable({
        siteId: v.id('sites'),
        storageId: v.id('_storage'),
        filename: v.string(),
        contentType: v.string(),
        uploadedBy: v.id('actors'),
        createdAt: v.number(),
    })
        .index('by_site', ['siteId'])
        .index('by_storage', ['storageId']),

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
        deviceWakePolicy,
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
        wakePolicy: v.optional(deviceWakePolicy),
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

    systemMessages: defineTable({
        actorId: v.id('actors'),
        type: systemMessageType,
        folder: systemMessageFolder,
        readAt: v.optional(v.number()),
        title: v.string(),
        body: v.optional(v.string()),
        refTable: v.optional(v.string()),
        refId: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
        archivedAt: v.optional(v.number()),
        deletedAt: v.optional(v.number()),
    })
        .index('by_actor', ['actorId'])
        .index('by_actor_and_folder', ['actorId', 'folder'])
        .index('by_ref', ['refTable', 'refId']),

    siteInvites: defineTable({
        siteId: v.id('sites'),
        organizationId: v.id('organizations'),
        targetActorId: v.id('actors'),
        invitedByActorId: v.optional(v.id('actors')),
        status: siteInviteStatus,
        messageId: v.optional(v.id('systemMessages')),
        createdAt: v.number(),
        updatedAt: v.number(),
        respondedAt: v.optional(v.number()),
        revokedAt: v.optional(v.number()),
        expiresAt: v.optional(v.number()),
    })
        .index('by_site', ['siteId'])
        .index('by_site_and_status', ['siteId', 'status'])
        .index('by_target_actor', ['targetActorId'])
        .index('by_target_actor_and_status', ['targetActorId', 'status'])
        .index('by_site_and_target_actor_and_status', ['siteId', 'targetActorId', 'status'])
        .index('by_message', ['messageId']),

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

    jobStates: defineTable({
        siteId: v.optional(v.id('sites')),
        actorId: v.id('actors'),
        type: jobType,
        resourceType: jobResourceType,
        resourceId: v.string(),
        source: jobSource,
        workKey: v.string(),
        status: jobStatus,
        executionCount: v.number(),
        errorMessage: v.optional(v.string()),
        currentExecutionId: v.optional(v.id('jobLogs')),
        latestExecutionId: v.optional(v.id('jobLogs')),
        latestFinishedExecutionId: v.optional(v.id('jobLogs')),
        latestSuccessfulExecutionId: v.optional(v.id('jobLogs')),
        createdAt: v.number(),
        updatedAt: v.number(),
        queuedAt: v.optional(v.number()),
        startedAt: v.optional(v.number()),
        finishedAt: v.optional(v.number()),
    })
        .index('by_site', ['siteId'])
        .index('by_workKey', ['workKey'])
        .index('by_resource', ['resourceType', 'resourceId'])
        .index('by_site_and_resourceType_and_updatedAt', ['siteId', 'resourceType', 'updatedAt']),

    jobLogs: defineTable({
        siteId: v.optional(v.id('sites')),
        actorId: v.id('actors'),
        type: jobType,
        resourceType: jobResourceType,
        resourceId: v.string(),
        source: jobSource,
        status: jobStatus,
        workKey: v.optional(v.string()),
        jobStateId: v.optional(v.id('jobStates')),
        workerJobId: v.optional(v.string()),
        executionNumber: v.optional(v.number()),
        retryOfJobId: v.optional(v.id('jobLogs')),
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
        .index('by_workKey_and_createdAt', ['workKey', 'createdAt'])
        .index('by_jobState_and_createdAt', ['jobStateId', 'createdAt'])
        .index('by_resource', ['resourceType', 'resourceId'])
        .index('by_status', ['status']),
});
