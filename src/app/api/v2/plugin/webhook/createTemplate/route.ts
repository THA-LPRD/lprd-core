import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { AuthError } from '@/lib/auth-errors';
import { requirePermission } from '@/lib/authz';
import { recordAndEnqueueJob } from '@/lib/jobs/dispatch';
import { permissionCatalog } from '@/lib/permissions';
import { containsImgFuncs } from '@/lib/template-data';

/**
 * POST /api/v2/plugin/webhook/createTemplate
 * Creates or updates a global template for a plugin.
 * Authenticated via Bearer JWT token.
 */
export async function POST(request: Request) {
    try {
        const authorization = await requirePermission(permissionCatalog.org.template.manage.upsert.self, { request });
        if (!authorization.application) {
            throw new AuthError('Application not found', 401);
        }

        const token = authorization.accessToken;
        const body = await request.json();
        const { name, description, template_html, sample_data, variants, preferred_variant_index, version } = body;

        if (!name || !template_html || !variants || preferred_variant_index === undefined) {
            return NextResponse.json(
                { error: 'name, template_html, variants, and preferred_variant_index are required' },
                { status: 400 },
            );
        }

        const result = await fetchMutation(
            api.templates.global.upsertGlobalForApplication,
            {
                pluginId: authorization.application._id,
                name,
                description: description ?? undefined,
                templateHtml: template_html,
                sampleData: sample_data ?? undefined,
                variants,
                preferredVariantIndex: preferred_variant_index,
                version: version ?? undefined,
            },
            { token },
        );

        if (result.needsNormalization || containsImgFuncs(sample_data)) {
            await recordAndEnqueueJob({
                token,
                actorId: authorization.actor._id,
                type: 'normalize-images',
                resourceType: 'template',
                resourceId: result.id,
                source: 'pluginTemplateUpsert',
                payload: {
                    type: 'normalize-images',
                    payload: {
                        resourceType: 'template',
                        resourceId: result.id,
                        actorId: authorization.actor._id,
                        siteId: undefined,
                        source: 'pluginTemplateUpsert',
                        nextJobs: [
                            {
                                type: 'template-thumbnail',
                                payload: {
                                    templateId: result.id,
                                    siteId: undefined,
                                    siteSlug: '_internal',
                                },
                            },
                        ],
                    },
                },
            });
        } else {
            await recordAndEnqueueJob({
                token,
                actorId: authorization.actor._id,
                type: 'template-thumbnail',
                resourceType: 'template',
                resourceId: result.id,
                source: 'pluginTemplateUpsert',
                payload: {
                    type: 'template-thumbnail',
                    payload: {
                        templateId: result.id,
                        siteId: undefined,
                        siteSlug: '_internal',
                    },
                },
            });
        }

        const status = result.created ? 201 : 200;
        return NextResponse.json({ id: result.id }, { status });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Plugin createTemplate error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
