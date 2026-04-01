import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { convexAdmin } from '@/lib/convex-admin';
import { authenticatePlugin, AuthError, requireScope } from '@/lib/application/auth';
import { generateScreenshot, getVariantPixelSize } from '@/lib/render/thumbnail';

/**
 * POST /api/v2/plugin/webhook/createTemplate
 * Creates or updates a global template for a plugin.
 * Authenticated via Bearer JWT token.
 */
export async function POST(request: Request) {
    try {
        const plugin = await authenticatePlugin(request);
        requireScope(plugin, 'create_template');

        const body = await request.json();
        const { name, description, template_html, sample_data, variants, preferred_variant_index, version } = body;

        if (!name || !template_html || !variants || preferred_variant_index === undefined) {
            return NextResponse.json(
                { error: 'name, template_html, variants, and preferred_variant_index are required' },
                { status: 400 },
            );
        }

        const result = await convexAdmin.mutation(internal.templates.global.upsertGlobal, {
            pluginId: plugin._id,
            name,
            description: description ?? undefined,
            templateHtml: template_html,
            sampleData: sample_data ?? undefined,
            variants,
            preferredVariantIndex: preferred_variant_index,
            version: version ?? undefined,
        });

        // Generate and store thumbnail (best-effort — don't fail the request)
        try {
            const preferred = variants[preferred_variant_index];
            if (preferred) {
                const { origin } = new URL(request.url);
                const { width, height } = getVariantPixelSize(preferred);

                const png = await generateScreenshot({
                    renderPath: `/site/_internal/templates/render/${result.id}`,
                    width,
                    height,
                    origin,
                });

                const uploadUrl: string = await convexAdmin.mutation(
                    internal.templates.crud.generateUploadUrlInternal,
                    {},
                );
                const uploadRes = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'image/png' },
                    body: png,
                });
                const { storageId } = await uploadRes.json();

                await convexAdmin.mutation(internal.templates.crud.storeThumbnailInternal, {
                    id: result.id,
                    storageId,
                });
            }
        } catch (err) {
            console.warn('Thumbnail generation failed for plugin template:', err);
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
