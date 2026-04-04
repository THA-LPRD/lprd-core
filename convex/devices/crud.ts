import { v } from 'convex/values';
import { mutation, type MutationCtx, query } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { deviceDataBinding, deviceStatus } from '../schema';
import { getPermissions } from '../lib/acl';
import { containsImgFuncs, deleteImageBlobs } from '../lib/template_data';
import { getCurrentActor, getMembership } from '../actors';

const MANUAL_APPLICATION_NAME = '__manual__';

/** Find the internal manual application. Returns its ID or null. */
async function findManualPlugin(ctx: MutationCtx) {
    const allPlugins = await ctx.db.query('applications').collect();
    return allPlugins.find((p) => p.type === 'internal' && p.name === MANUAL_APPLICATION_NAME)?._id ?? null;
}

/** Find or create the internal manual application. Returns its ID. */
async function getOrCreateManualPlugin(ctx: MutationCtx) {
    const existing = await findManualPlugin(ctx);
    if (existing) return existing;

    const now = Date.now();
    const actorId = await ctx.db.insert('actors', {
        type: 'serviceAccount',
        name: 'Manual Data Service Account',
        status: 'active',
        role: 'user',
        createdAt: now,
        updatedAt: now,
    });

    return ctx.db.insert('applications', {
        actorId,
        name: MANUAL_APPLICATION_NAME,
        type: 'internal',
        status: 'active',
        workosApplicationId: `manual-${actorId}`,
        workosClientId: `manual-${actorId}`,
        createdAt: now,
        updatedAt: now,
    });
}

/** Delete all manual pluginData records for a device. */
async function deleteManualDataForDevice(
    ctx: MutationCtx,
    pluginId: Id<'applications'>,
    siteId: Id<'sites'>,
    deviceId: Id<'devices'>,
) {
    const prefix = `${deviceId}:`;
    const records = await ctx.db
        .query('pluginData')
        .withIndex('by_application_site_topic_entry', (q) =>
            q.eq('applicationId', pluginId).eq('siteId', siteId).eq('topic', 'manual'),
        )
        .collect();

    for (const record of records) {
        if (record.entry.startsWith(prefix)) {
            await deleteImageBlobs(ctx, record.data);
            await ctx.db.delete(record._id);
        }
    }
}

/**
 * Create a new device.
 * Requires device.manage permission.
 */
export const create = mutation({
    args: {
        siteId: v.id('sites'),
        name: v.string(),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const now = Date.now();
        return ctx.db.insert('devices', {
            siteId: args.siteId,
            name: args.name,
            description: args.description,
            tags: args.tags ?? [],
            status: 'pending',
            apiVersion: 'v2',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get a device by its Convex ID.
 * Requires device.view permission.
 * Resolves current/next storage URLs.
 */
export const getById = query({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return null;

        const device = await ctx.db.get(args.id);
        if (!device) return null;

        const membership = await getMembership(ctx, actor._id, device.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.view) return null;

        let lastUrl: string | null = null;
        let currentUrl: string | null = null;
        let nextUrl: string | null = null;

        if (device.last?.storageId) {
            lastUrl = await ctx.storage.getUrl(device.last.storageId);
        }
        if (device.current?.storageId) {
            currentUrl = await ctx.storage.getUrl(device.current.storageId);
        }
        if (device.next?.storageId) {
            nextUrl = await ctx.storage.getUrl(device.next.storageId);
        }

        return { ...device, lastUrl, currentUrl, nextUrl };
    },
});

/**
 * List devices in a site.
 * Requires device.view permission.
 * Resolves current storage URLs for card display.
 */
export const listBySite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return [];

        const membership = await getMembership(ctx, actor._id, args.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.view) return [];

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        return Promise.all(
            devices.map(async (device) => {
                let currentUrl: string | null = null;
                if (device.current?.storageId) {
                    currentUrl = await ctx.storage.getUrl(device.current.storageId);
                }
                return { ...device, currentUrl };
            }),
        );
    },
});

/**
 * Update a device.
 * Requires device.manage permission.
 */
export const update = mutation({
    args: {
        id: v.id('devices'),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        status: v.optional(deviceStatus),
        frameId: v.optional(v.id('frames')),
        dataBindings: v.optional(v.array(deviceDataBinding)),
        clearFrame: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.id);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, actor._id, device.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const { id, clearFrame, ...rest } = args;
        void id;

        const patch: Record<string, unknown> = { ...rest, updatedAt: Date.now() };

        if (clearFrame) {
            patch.frameId = undefined;
            patch.dataBindings = undefined;

            // Clean up manual data when frame is cleared
            const manualPluginId = await findManualPlugin(ctx);
            if (manualPluginId) {
                await deleteManualDataForDevice(ctx, manualPluginId, device.siteId, device._id);
            }
        }

        await ctx.db.patch(device._id, patch);
    },
});

/**
 * Delete a device.
 * Requires device.manage permission.
 */
export const remove = mutation({
    args: { id: v.id('devices') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.id);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, actor._id, device.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        // Clean up manual data
        const manualPluginId = await findManualPlugin(ctx);
        if (manualPluginId) {
            await deleteManualDataForDevice(ctx, manualPluginId, device.siteId, device._id);
        }

        if (device.last?.storageId) {
            await ctx.storage.delete(device.last.storageId);
        }
        if (device.current?.storageId) {
            await ctx.storage.delete(device.current.storageId);
        }
        if (device.next?.storageId) {
            await ctx.storage.delete(device.next.storageId);
        }

        await ctx.db.delete(device._id);
    },
});

/**
 * Save manual data for device widgets.
 * Creates/updates pluginData entries and manages bindings.
 * Requires device.manage permission.
 */
export const saveManualData = mutation({
    args: {
        deviceId: v.id('devices'),
        entries: v.array(
            v.object({
                widgetId: v.string(),
                data: v.optional(v.any()),
            }),
        ),
    },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.deviceId);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, actor._id, device.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const pluginId = await getOrCreateManualPlugin(ctx);
        const now = Date.now();
        const normalizationRecordIds: Id<'pluginData'>[] = [];

        // Store each entry
        const savedWidgetIds = new Set<string>();
        for (const { widgetId, data } of args.entries) {
            const entry = `${args.deviceId}:${widgetId}`;
            const hasData =
                data != null &&
                !(typeof data === 'object' && Object.keys(data as Record<string, unknown>).length === 0);

            const existing = await ctx.db
                .query('pluginData')
                .withIndex('by_application_site_topic_entry', (q) =>
                    q
                        .eq('applicationId', pluginId)
                        .eq('siteId', device.siteId)
                        .eq('topic', 'manual')
                        .eq('entry', entry),
                )
                .unique();

            if (!hasData) {
                // Delete if no data
                if (existing) {
                    await deleteImageBlobs(ctx, existing.data);
                    await ctx.db.delete(existing._id);
                }
                continue;
            }

            savedWidgetIds.add(widgetId);

            let recordId: Id<'pluginData'>;
            if (existing) {
                await deleteImageBlobs(ctx, existing.data);
                await ctx.db.patch(existing._id, { data, receivedAt: now });
                recordId = existing._id;
            } else {
                recordId = await ctx.db.insert('pluginData', {
                    applicationId: pluginId,
                    siteId: device.siteId,
                    topic: 'manual',
                    entry,
                    contentType: 'application/json',
                    data,
                    ttlSeconds: 3600,
                    expiresAt: 0,
                    receivedAt: now,
                });
            }

            // Schedule image processing if data has img() markers
            if (containsImgFuncs(data)) {
                normalizationRecordIds.push(recordId);
            }
        }

        // Update dataBindings: keep existing non-manual bindings, add/remove manual ones
        const currentBindings = device.dataBindings ?? [];

        const updatedWidgetIds = new Set(args.entries.map((e) => e.widgetId));
        const nonManualBindings = currentBindings.filter((b) => {
            if (b.applicationId !== pluginId || b.topic !== 'manual') return true;
            const widgetIdFromEntry = b.entry.slice(b.entry.indexOf(':') + 1);
            return !updatedWidgetIds.has(widgetIdFromEntry);
        });

        // Add new manual bindings for widgets that have data
        const manualBindings = [...savedWidgetIds].map((widgetId) => ({
            widgetId,
            applicationId: pluginId,
            topic: 'manual' as const,
            entry: `${args.deviceId}:${widgetId}`,
        }));

        // Manual bindings go AFTER plugin bindings for last-wins precedence
        const newBindings = [...nonManualBindings, ...manualBindings];

        await ctx.db.patch(device._id, {
            dataBindings: newBindings,
            updatedAt: now,
        });

        return { normalizationRecordIds };
    },
});

/**
 * Get manual data for all widgets on a device.
 * Returns Record<widgetId, data>.
 * Requires device.view permission.
 */
export const getManualData = query({
    args: { deviceId: v.id('devices') },
    handler: async (ctx, args) => {
        const actor = await getCurrentActor(ctx);
        if (!actor) return {};

        const device = await ctx.db.get(args.deviceId);
        if (!device) return {};

        const membership = await getMembership(ctx, actor._id, device.siteId);
        const perms = getPermissions(actor, membership);
        if (!perms.device.view) return {};

        // Find system manual plugin
        const allPlugins = await ctx.db.query('applications').collect();
        const manualPlugin = allPlugins.find((p) => p.name === MANUAL_APPLICATION_NAME);
        if (!manualPlugin) return {};

        // Query manual data for this device
        const prefix = `${args.deviceId}:`;
        const records = await ctx.db
            .query('pluginData')
            .withIndex('by_application_site_topic_entry', (q) =>
                q.eq('applicationId', manualPlugin._id).eq('siteId', device.siteId).eq('topic', 'manual'),
            )
            .collect();

        const result: Record<string, unknown> = {};
        for (const record of records) {
            if (record.entry.startsWith(prefix)) {
                const widgetId = record.entry.slice(prefix.length);
                result[widgetId] = record.data;
            }
        }
        return result;
    },
});
