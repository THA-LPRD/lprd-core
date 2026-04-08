import { type GenericMutationCtx, paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import type { DataModel, Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { jobSource } from '../schema';
import { permissionCatalog } from '../lib/permissions';
import { requirePermission, resolveAuthorization } from '../lib/authz';
import type { LatestJobState } from './types';

const templateJobType = v.union(v.literal('normalize-images'), v.literal('template-thumbnail'));

export async function updateTemplateLatestJobState(
    ctx: GenericMutationCtx<DataModel>,
    templateId: Id<'templates'>,
    latestJob: LatestJobState,
) {
    const template = await ctx.db.get(templateId);
    if (template) {
        await ctx.db.patch(template._id, { latestJob });
    }
}

export async function markTemplateJobSucceeded(
    ctx: GenericMutationCtx<DataModel>,
    jobId: Id<'jobs'>,
    templateId: Id<'templates'>,
) {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.resourceType !== 'template' || job.resourceId !== templateId) {
        throw new Error('Job does not match template');
    }

    const now = Date.now();
    await ctx.db.patch(job._id, {
        status: 'succeeded',
        finishedAt: now,
        errorMessage: undefined,
    });

    await updateTemplateLatestJobState(ctx, templateId, {
        status: 'succeeded',
        updatedAt: now,
        jobId: job._id,
    });
}

export const createResourceJob = mutation({
    args: {
        actorId: v.id('actors'),
        siteId: v.optional(v.id('sites')),
        type: templateJobType,
        templateId: v.id('templates'),
        source: jobSource,
        dedupeKey: v.string(),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.templateId);
        if (!template) throw new Error('Template not found');

        let siteId: Id<'sites'> | undefined;
        if (template.scope === 'site' && template.siteId) {
            if (args.siteId && args.siteId !== template.siteId)
                throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.enqueue, {
                siteId: template.siteId,
            });
            siteId = template.siteId;
        } else {
            if (args.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.enqueue, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const existing = await ctx.db
            .query('jobs')
            .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
            .unique();
        if (existing && (existing.status === 'pending' || existing.status === 'running')) {
            return existing._id;
        }

        const now = Date.now();
        const jobId = await ctx.db.insert('jobs', {
            actorId: args.actorId,
            siteId,
            type: args.type,
            resourceType: 'template',
            resourceId: args.templateId,
            source: args.source,
            dedupeKey: args.dedupeKey,
            payload: args.payload,
            status: 'pending',
            attempts: existing ? existing.attempts + 1 : 1,
            createdAt: now,
        });

        await updateTemplateLatestJobState(ctx, args.templateId, {
            status: 'pending',
            updatedAt: now,
            jobId,
        });

        return jobId;
    },
});

export const start = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.resourceType !== 'template') throw new Error('Job does not target a template');
        if (job.type !== 'normalize-images' && job.type !== 'template-thumbnail') {
            throw new Error(`Job type '${job.type}' is not valid for templates`);
        }

        const template = await ctx.db.get(job.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (job.siteId && job.siteId !== template.siteId) throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (job.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'running',
            startedAt: now,
            errorMessage: undefined,
        });

        await updateTemplateLatestJobState(ctx, template._id, {
            status: 'running',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const fail = mutation({
    args: { id: v.id('jobs'), errorMessage: v.string() },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.resourceType !== 'template') throw new Error('Job does not target a template');
        if (job.type !== 'normalize-images' && job.type !== 'template-thumbnail') {
            throw new Error(`Job type '${job.type}' is not valid for templates`);
        }

        const template = await ctx.db.get(job.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (job.siteId && job.siteId !== template.siteId) throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (job.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'failed',
            finishedAt: now,
            errorMessage: args.errorMessage,
        });

        await updateTemplateLatestJobState(ctx, template._id, {
            status: 'failed',
            updatedAt: now,
            errorMessage: args.errorMessage,
            jobId: job._id,
        });
    },
});

export const cancel = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.resourceType !== 'template') throw new Error('Job does not target a template');
        if (job.status !== 'pending') throw new Error('Only pending jobs can be cancelled');
        if (job.type !== 'normalize-images' && job.type !== 'template-thumbnail') {
            throw new Error(`Job type '${job.type}' is not valid for templates`);
        }

        const template = await ctx.db.get(job.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (job.siteId && job.siteId !== template.siteId) throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (job.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'cancelled',
            finishedAt: now,
            errorMessage: undefined,
        });

        await updateTemplateLatestJobState(ctx, template._id, {
            status: 'cancelled',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const pause = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.resourceType !== 'template') throw new Error('Job does not target a template');
        if (job.status !== 'pending') throw new Error('Only pending jobs can be paused');
        if (job.type !== 'normalize-images' && job.type !== 'template-thumbnail') {
            throw new Error(`Job type '${job.type}' is not valid for templates`);
        }

        const template = await ctx.db.get(job.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (job.siteId && job.siteId !== template.siteId) throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (job.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'paused',
            finishedAt: undefined,
            errorMessage: undefined,
        });

        await updateTemplateLatestJobState(ctx, template._id, {
            status: 'paused',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const resume = mutation({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job) throw new Error('Job not found');
        if (job.resourceType !== 'template') throw new Error('Job does not target a template');
        if (job.status !== 'paused') throw new Error('Only paused jobs can be resumed');
        if (job.type !== 'normalize-images' && job.type !== 'template-thumbnail') {
            throw new Error(`Job type '${job.type}' is not valid for templates`);
        }

        const template = await ctx.db.get(job.resourceId as Id<'templates'>);
        if (!template) throw new Error('Template not found');

        if (template.scope === 'site' && template.siteId) {
            if (job.siteId && job.siteId !== template.siteId) throw new Error('Job site does not match template site');
            await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.write, {
                siteId: template.siteId,
            });
        } else {
            if (job.siteId) throw new Error('Organization template jobs cannot be bound to a site');
            await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.write, {
                organizationId: template.organizationId ?? undefined,
            });
        }

        const now = Date.now();
        await ctx.db.patch(job._id, {
            status: 'pending',
            startedAt: undefined,
            finishedAt: undefined,
            errorMessage: undefined,
        });

        await updateTemplateLatestJobState(ctx, template._id, {
            status: 'pending',
            updatedAt: now,
            jobId: job._id,
        });
    },
});

export const getById = query({
    args: { id: v.id('jobs') },
    handler: async (ctx, args) => {
        const job = await ctx.db.get(args.id);
        if (!job || job.resourceType !== 'template') return null;
        if (job.type !== 'normalize-images' && job.type !== 'template-thumbnail') return null;

        const template = await ctx.db.get(job.resourceId as Id<'templates'>);
        if (!template) return null;

        try {
            if (template.scope === 'site' && template.siteId) {
                if (job.siteId && job.siteId !== template.siteId) return null;
                await requirePermission(ctx, permissionCatalog.org.site.template.manage.job.read, {
                    siteId: template.siteId,
                });
            } else {
                if (job.siteId) return null;
                await requirePermission(ctx, permissionCatalog.org.template.manage.upsert.job.read, {
                    organizationId: template.organizationId ?? undefined,
                });
            }
        } catch {
            return null;
        }

        return job;
    },
});

export const listBySite = query({
    args: {
        siteId: v.id('sites'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const authorization = await resolveAuthorization(ctx, { siteId: args.siteId });
        if (!authorization?.can(permissionCatalog.org.site.template.manage.job.read)) {
            return { page: [], isDone: true, continueCursor: '' };
        }

        return ctx.db
            .query('jobs')
            .withIndex('by_site_and_resourceType_and_createdAt', (q) =>
                q.eq('siteId', args.siteId).eq('resourceType', 'template'),
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});
