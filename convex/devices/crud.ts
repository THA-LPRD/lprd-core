import { v } from 'convex/values';
import { mutation, type MutationCtx, query } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { deviceDataBinding, deviceStatus } from '../schema';
import { getPermissions } from '../lib/acl';
import { containsImgFuncs, deleteImageBlobs } from '../lib/template_data';
import { getCurrentUser, getMembership } from '../users';

const MANUAL_PLUGIN_NAME = '__manual__';

/** Find the system manual plugin. Returns its ID or null. */
async function findManualPlugin(ctx: MutationCtx) {
    const plugins = await ctx.db
        .query('plugins')
        .withIndex('by_status', (q) => q.eq('status', 'system'))
        .collect();
    return plugins.find((p) => p.name === MANUAL_PLUGIN_NAME)?._id ?? null;
}

/** Find or create the system manual plugin. Returns its ID. */
async function getOrCreateManualPlugin(ctx: MutationCtx) {
    const existing = await findManualPlugin(ctx);
    if (existing) return existing;

    const now = Date.now();
    return ctx.db.insert('plugins', {
        name: MANUAL_PLUGIN_NAME,
        version: '1.0.0',
        description: 'System plugin for manual data entries',
        status: 'system',
        baseUrl: '',
        topics: [{ id: 'manual', key: 'manual', label: 'Manual Data' }],
        healthCheckIntervalMs: 0,
        createdAt: now,
        updatedAt: now,
    });
}

/** Delete all manual pluginData records for a device. */
async function deleteManualDataForDevice(
    ctx: MutationCtx,
    pluginId: Id<'plugins'>,
    organizationId: Id<'organizations'>,
    deviceId: Id<'devices'>,
) {
    const prefix = `${deviceId}:`;
    const records = await ctx.db
        .query('pluginData')
        .withIndex('by_plugin_org_topic_entry', (q) =>
            q.eq('pluginId', pluginId).eq('organizationId', organizationId).eq('topic', 'manual'),
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
        organizationId: v.id('organizations'),
        name: v.string(),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const now = Date.now();
        return ctx.db.insert('devices', {
            organizationId: args.organizationId,
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
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const device = await ctx.db.get(args.id);
        if (!device) return null;

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
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
 * List devices in an organization.
 * Requires device.view permission.
 * Resolves current storage URLs for card display.
 */
export const listByOrganization = query({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const membership = await getMembership(ctx, user._id, args.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return [];

        const devices = await ctx.db
            .query('devices')
            .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
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
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.id);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
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
                await deleteManualDataForDevice(ctx, manualPluginId, device.organizationId, device._id);
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
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.id);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        // Clean up manual data
        const manualPluginId = await findManualPlugin(ctx);
        if (manualPluginId) {
            await deleteManualDataForDevice(ctx, manualPluginId, device.organizationId, device._id);
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
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db.get(args.deviceId);
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        const pluginId = await getOrCreateManualPlugin(ctx);
        const now = Date.now();

        // Store each entry
        const savedWidgetIds = new Set<string>();
        for (const { widgetId, data } of args.entries) {
            const entry = `${args.deviceId}:${widgetId}`;
            const hasData =
                data != null &&
                !(typeof data === 'object' && Object.keys(data as Record<string, unknown>).length === 0);

            const existing = await ctx.db
                .query('pluginData')
                .withIndex('by_plugin_org_topic_entry', (q) =>
                    q
                        .eq('pluginId', pluginId)
                        .eq('organizationId', device.organizationId)
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
                    pluginId,
                    organizationId: device.organizationId,
                    topic: 'manual',
                    entry,
                    contentType: 'application/json',
                    data,
                    ttlSeconds: 0,
                    expiresAt: 0,
                    receivedAt: now,
                });
            }

            // Schedule image processing if data has img() markers
            if (containsImgFuncs(data)) {
                await ctx.scheduler.runAfter(0, internal.plugins.images.processPluginDataImages, {
                    pluginDataId: recordId,
                });
            }
        }

        // Update dataBindings: keep existing non-manual bindings, add/remove manual ones
        const currentBindings = device.dataBindings ?? [];

        const updatedWidgetIds = new Set(args.entries.map((e) => e.widgetId));
        const nonManualBindings = currentBindings.filter((b) => {
            if (b.pluginId !== pluginId || b.topic !== 'manual') return true;
            const widgetIdFromEntry = b.entry.slice(b.entry.indexOf(':') + 1);
            return !updatedWidgetIds.has(widgetIdFromEntry);
        });

        // Add new manual bindings for widgets that have data
        const manualBindings = [...savedWidgetIds].map((widgetId) => ({
            widgetId,
            pluginId,
            topic: 'manual' as const,
            entry: `${args.deviceId}:${widgetId}`,
        }));

        // Manual bindings go AFTER plugin bindings for last-wins precedence
        const newBindings = [...nonManualBindings, ...manualBindings];

        await ctx.db.patch(device._id, {
            dataBindings: newBindings,
            updatedAt: now,
        });
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
        const user = await getCurrentUser(ctx);
        if (!user) return {};

        const device = await ctx.db.get(args.deviceId);
        if (!device) return {};

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return {};

        // Find system plugin
        const plugins = await ctx.db
            .query('plugins')
            .withIndex('by_status', (q) => q.eq('status', 'system'))
            .collect();

        const manualPlugin = plugins.find((p) => p.name === MANUAL_PLUGIN_NAME);
        if (!manualPlugin) return {};

        // Query manual data for this device
        const prefix = `${args.deviceId}:`;
        const records = await ctx.db
            .query('pluginData')
            .withIndex('by_plugin_org_topic_entry', (q) =>
                q.eq('pluginId', manualPlugin._id).eq('organizationId', device.organizationId).eq('topic', 'manual'),
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
