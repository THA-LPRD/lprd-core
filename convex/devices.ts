import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { deviceDataBinding, deviceStatus } from './schema';
import { getPermissions } from './lib/acl';
import { getCurrentUser, getMembership } from './users';
import { isTemplateData, resolveImageUrls } from './lib/template_data';

/**
 * Create a new device.
 * Requires device.manage permission.
 */
export const create = mutation({
    args: {
        id: v.string(), // UUIDv4
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
            id: args.id,
            organizationId: args.organizationId,
            name: args.name,
            description: args.description,
            tags: args.tags ?? [],
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get a device by its UUIDv4 id.
 * Requires device.view permission.
 * Resolves current/next storage URLs.
 */
export const getById = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
        if (!device) return null;

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.view) return null;

        let currentUrl: string | null = null;
        let nextUrl: string | null = null;

        if (device.current?.storageId) {
            currentUrl = await ctx.storage.getUrl(device.current.storageId);
        }
        if (device.next?.storageId) {
            nextUrl = await ctx.storage.getUrl(device.next.storageId);
        }

        return { ...device, currentUrl, nextUrl };
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
        id: v.string(),
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

        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
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
        }

        await ctx.db.patch(device._id, patch);
    },
});

/**
 * Delete a device.
 * Requires device.manage permission.
 */
export const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');

        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.id))
            .unique();
        if (!device) throw new Error('Device not found');

        const membership = await getMembership(ctx, user._id, device.organizationId);
        const perms = getPermissions(user, membership);
        if (!perms.device.manage) throw new Error('Forbidden');

        // Clean up render storage blobs
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
 * Set the next render for a device. Cleans up old next blob if present.
 * Called from Next.js after Playwright renders the device.
 */
export const setNext = mutation({
    args: {
        deviceId: v.string(),
        storageId: v.id('_storage'),
        renderedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.deviceId))
            .unique();
        if (!device) return;

        // Clean up old next blob
        if (device.next?.storageId) {
            await ctx.storage.delete(device.next.storageId);
        }

        await ctx.db.patch(device._id, {
            next: { storageId: args.storageId, renderedAt: args.renderedAt },
        });
    },
});

/**
 * Generate an upload URL for device render images.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error('Not authenticated');
        return ctx.storage.generateUploadUrl();
    },
});

/**
 * Get everything needed to render a device in one query.
 * No auth — used only by the Playwright render page.
 * Returns device, frame, templates, and resolved binding data.
 * TODO: should be removed in favor of auth-protected fetches
 */
export const getRenderBundle = query({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        const device = await ctx.db
            .query('devices')
            .withIndex('by_device_id', (q) => q.eq('id', args.deviceId))
            .unique();
        if (!device?.frameId) return null;

        const frame = await ctx.db.get(device.frameId);
        if (!frame) return null;

        // Collect template IDs
        const templateIds = new Set<string>();
        for (const w of frame.widgets) {
            if (w.templateId) templateIds.add(w.templateId);
        }
        if (frame.background) templateIds.add(frame.background.templateId);
        if (frame.foreground) templateIds.add(frame.foreground.templateId);

        // Fetch templates
        const templates: Record<string, { templateHtml: string; sampleData?: unknown }> = {};
        for (const tid of templateIds) {
            const t = await ctx.db.get(tid as Id<'templates'>);
            if (t) {
                templates[tid] = { templateHtml: t.templateHtml, sampleData: t.sampleData };
            }
        }

        // Resolve binding data
        const bindingData: Record<string, Record<string, unknown>> = {};
        if (device.dataBindings) {
            for (const binding of device.dataBindings) {
                const record = await ctx.db
                    .query('pluginData')
                    .withIndex('by_plugin_org_topic_entry', (q) =>
                        q
                            .eq('pluginId', binding.pluginId)
                            .eq('organizationId', device.organizationId)
                            .eq('topic', binding.topic)
                            .eq('entry', binding.entry),
                    )
                    .unique();

                if (!record) continue;

                let data = record.data as Record<string, unknown>;
                if (isTemplateData(data)) {
                    data = await resolveImageUrls(ctx, data);
                }

                if (!bindingData[binding.widgetId]) {
                    bindingData[binding.widgetId] = {};
                }
                Object.assign(bindingData[binding.widgetId], data);
            }
        }

        return { device, frame, templates, bindingData };
    },
});
