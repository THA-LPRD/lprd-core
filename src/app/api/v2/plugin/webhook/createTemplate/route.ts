import { fetchMutation } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { authenticatePlugin, AuthError, requireScope } from '@/lib/application/auth';
import { recordAndEnqueueJob } from '@/lib/worker-jobs';
import { containsImgFuncs } from '@/lib/template-data';

/**
 * POST /api/v2/plugin/webhook/createTemplate
 * Creates or updates a global template for a plugin.
 * Authenticated via Bearer JWT token.
 */
export async function POST(request: Request) {
    try {
        const plugin = await authenticatePlugin(request);
        requireScope(plugin, 'create_template');

        const token = request.headers.get('authorization')!.slice(7);
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
                pluginId: plugin._id,
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
                actorId: plugin.actorId,
                type: 'normalize-images',
                resourceType: 'template',
                resourceId: result.id,
                source: 'pluginTemplateUpsert',
                payload: {
                    type: 'normalize-images',
                    payload: {
                        resourceType: 'template',
                        resourceId: result.id,
                        actorId: plugin.actorId,
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
                actorId: plugin.actorId,
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
