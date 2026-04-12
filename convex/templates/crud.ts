import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { templateVariant } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import { deleteImageBlobs } from '../lib/template_data';
import { generateUploadUrl, replaceThumbnail } from '../lib/storage';
import { markTemplateJobSucceeded } from '../jobs/templateJobs';

/**
 * List all templates available to a site (organization-shared + site-scoped).
 * Requires `org.site.template.view`.
 */
export const listBySite = query({
    args: { siteId: v.id('sites') },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.template.view)) return [];

        const organizationId = authorization.site?.organizationId;
        if (!organizationId) return [];

        const organizationTemplates = await ctx.db
            .query('templates')
            .withIndex('by_organization_and_scope', (q) =>
                q.eq('organizationId', organizationId).eq('scope', 'organization'),
            )
            .collect();

        const orgTemplates = await ctx.db
            .query('templates')
            .withIndex('by_site', (q) => q.eq('siteId', args.siteId))
            .collect();

        // Resolve thumbnail URLs
        const all = [...organizationTemplates, ...orgTemplates];
        return Promise.all(
            all.map(async (t) => {
                let thumbnailUrl: string | null = null;
                if (t.thumbnailStorageId) {
                    thumbnailUrl = await ctx.storage.getUrl(t.thumbnailStorageId);
                }
                return { ...t, thumbnailUrl };
            }),
        );
    },
});

/**
 * Get a single template by ID.
 * Requires `org.site.template.view` for site-scoped templates and `org.template.view` for organization-scoped templates.
 * Resolves img field storageIds to serving URLs.
 */
export const getById = query({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (!template) return null;

        // Organization-scoped templates use the organization-level permission branch.
        if (template.scope === 'site' && template.siteId) {
            const authorization = await resolveAuthorization(ctx, { siteId: template.siteId });
            if (!authorization?.can(permissionCatalog.org.site.template.view)) return null;
        } else {
            const authorization = await resolveAuthorization(ctx, {
                organizationId: template.organizationId ?? undefined,
            });
            if (!authorization?.can(permissionCatalog.org.template.view)) return null;
        }

        let thumbnailUrl: string | null = null;
        if (template.thumbnailStorageId) {
            thumbnailUrl = await ctx.storage.getUrl(template.thumbnailStorageId);
        }

        return { ...template, thumbnailUrl };
    },
});

/**
 * Create a new site-scoped template.
 * Requires `org.site.template.manage`.
 */
export const create = mutation({
    args: {
        siteId: v.id('sites'),
        name: v.string(),
        description: v.optional(v.string()),
        templateHtml: v.string(),
        sampleData: v.optional(v.any()),
        variants: v.array(templateVariant),
        preferredVariantIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const authorization = await requirePermission(ctx, permissionCatalog.org.site.template.manage.self, {
            siteId: args.siteId,
        });
        const { actor, site } = authorization;
        if (!site?.organizationId) throw new Error('Site organization required');

        const now = Date.now();

        return await ctx.db.insert('templates', {
            scope: 'site',
            organizationId: site.organizationId,
            siteId: args.siteId,
            createdBy: actor._id,
            name: args.name,
            description: args.description,
            templateHtml: args.templateHtml,
            sampleData: args.sampleData,
            variants: args.variants,
            preferredVariantIndex: args.preferredVariantIndex,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Update a site-scoped template.
 * Requires `org.site.template.manage`. Rejects organization-scoped templates.
 */
export const update = mutation({
    args: {
        id: v.id('templates'),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        templateHtml: v.optional(v.string()),
        sampleData: v.optional(v.any()),
        variants: v.optional(v.array(templateVariant)),
        preferredVariantIndex: v.optional(v.number()),
        thumbnailStorageId: v.optional(v.id('_storage')),
    },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope !== 'site') throw new Error('Cannot edit organization templates');

        await requirePermission(ctx, permissionCatalog.org.site.template.manage.self, { siteId: template.siteId! });

        const { id, ...updates } = args;
        void id;
        await ctx.db.patch(template._id, { ...updates, updatedAt: Date.now() });
    },
});

/**
 * Delete a site-scoped template.
 * Requires `org.site.template.manage`. Rejects organization-scoped templates.
 * Cleans up thumbnail and image storage blobs.
 */
export const remove = mutation({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');
        if (template.scope !== 'site') throw new Error('Cannot delete organization templates');

        await requirePermission(ctx, permissionCatalog.org.site.template.manage.self, { siteId: template.siteId! });

        if (template.thumbnailStorageId) {
            await ctx.storage.delete(template.thumbnailStorageId);
        }

        // Clean up image blobs in sampleData
        await deleteImageBlobs(ctx, template.sampleData);

        await ctx.db.delete(template._id);
    },
});

/**
 * Duplicate any template as a new site-scoped template.
 * Requires `org.site.template.manage` on the target site.
 */
export const duplicate = mutation({
    args: {
        id: v.id('templates'),
        siteId: v.id('sites'),
    },
    handler: async (ctx, args) => {
        const authorization = await requirePermission(ctx, permissionCatalog.org.site.template.manage.self, {
            siteId: args.siteId,
        });
        const { actor, site } = authorization;
        if (!site?.organizationId) throw new Error('Site organization required');

        const source = await ctx.db.get(args.id);
        if (!source) throw new Error('Template not found');

        const now = Date.now();
        return ctx.db.insert('templates', {
            scope: 'site',
            organizationId: site.organizationId,
            siteId: args.siteId,
            createdBy: actor._id,
            name: `${source.name} (Copy)`,
            description: source.description,
            templateHtml: source.templateHtml,
            sampleData: source.sampleData,
            variants: source.variants,
            preferredVariantIndex: source.preferredVariantIndex,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Get everything needed to render a template in one query.
 * Requires `org.site.template.view` for site templates or `org.template.view` for organization-scoped templates.
 * Used by the Playwright render page and worker artifact routes.
 */
export const getRenderBundle = query({
    args: { templateId: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.templateId);
        if (!template) return null;

        const authorization = await resolveAuthorization(ctx, {
            siteId: template.siteId ?? undefined,
            organizationId: template.organizationId ?? undefined,
        });
        if (!authorization) throw new Error('Render bundle: not authenticated');

        if (template.scope === 'site' && template.siteId) {
            if (!authorization.can(permissionCatalog.org.site.template.view)) {
                throw new Error('Render bundle: template.view permission denied');
            }
        } else if (!authorization.can(permissionCatalog.org.template.view)) {
            throw new Error('Render bundle: template.view permission denied');
        }

        return {
            templateHtml: template.templateHtml,
            sampleData: template.sampleData,
            variants: template.variants,
            preferredVariantIndex: template.preferredVariantIndex,
        };
    },
});


export const createThumbnailUploadUrl = mutation({
    args: { id: v.id('templates') },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.thumbnail.write, {
                siteId: template.siteId,
            });
        } else {
            await requirePermission(ctx, permissionCatalog.org.template.manage.thumbnail.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        return generateUploadUrl(ctx);
    },
});


export const storeThumbnailForJob = mutation({
    args: {
        id: v.id('templates'),
        storageId: v.id('_storage'),
        jobId: v.optional(v.id('jobLogs')),
    },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.thumbnail.write, {
                siteId: template.siteId,
            });
        } else {
            await requirePermission(ctx, permissionCatalog.org.template.manage.thumbnail.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        await replaceThumbnail(ctx, args.id, args.storageId);

        if (args.jobId) {
            await markTemplateJobSucceeded(ctx, args.jobId, args.id);
        }
    },
});
