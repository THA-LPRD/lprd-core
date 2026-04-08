import { v } from 'convex/values';
import { query } from '../_generated/server';
import { fetchTemplateMap } from '../lib/storage';
import { permissionCatalog } from '../lib/permissions';
import { resolveAuthorization } from '../lib/authz';

/**
 * Get everything needed to render a device in one query.
 * Requires `org.site.device.view`.
 * Used by the Playwright render page and worker artifact routes.
 * Returns device, frame, templates, and resolved binding data.
 */
export const getRenderBundle = query({
    args: { deviceId: v.id('devices') },
    handler: async (ctx, args) => {
        const device = await ctx.db.get(args.deviceId);
        if (!device?.frameId) return null;

        const authorization = await resolveAuthorization(ctx, { siteId: device.siteId });
        if (!authorization) throw new Error('Render bundle: not authenticated');

        if (!authorization.can(permissionCatalog.org.site.device.view)) {
            throw new Error('Render bundle: device.view permission denied');
        }

        const frame = await ctx.db.get(device.frameId);
        if (!frame) return null;

        // Collect template IDs
        const templateIds = new Set<string>();
        for (const w of frame.widgets) {
            if (w.templateId) templateIds.add(w.templateId);
        }
        if (frame.background) templateIds.add(frame.background.templateId);
        if (frame.foreground) templateIds.add(frame.foreground.templateId);

        const templates = await fetchTemplateMap(ctx, templateIds);

        // Resolve binding data
        const bindingData: Record<string, Record<string, unknown>> = {};
        if (device.dataBindings) {
            for (const binding of device.dataBindings) {
                const record = await ctx.db
                    .query('pluginData')
                    .withIndex('by_application_site_topic_entry', (q) =>
                        q
                            .eq('applicationId', binding.applicationId)
                            .eq('siteId', device.siteId)
                            .eq('topic', binding.topic)
                            .eq('entry', binding.entry),
                    )
                    .unique();

                if (!record) continue;

                const data = record.data as Record<string, unknown>;

                if (!bindingData[binding.widgetId]) {
                    bindingData[binding.widgetId] = {};
                }
                Object.assign(bindingData[binding.widgetId], data);
            }
        }

        return { device, frame, templates, bindingData };
    },
});
