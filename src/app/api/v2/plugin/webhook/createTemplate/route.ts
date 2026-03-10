import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { asPublic, getConvexClient } from '@/lib/convex-server';
import { authenticatePlugin, requireScope, AuthError } from '@/lib/plugin/auth';

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

        const convex = getConvexClient();

        const result = await convex.mutation(asPublic(internal.templates.global.upsertGlobal), {
            pluginId: plugin._id,
            name,
            description: description ?? undefined,
            templateHtml: template_html,
            sampleData: sample_data ?? undefined,
            variants,
            preferredVariantIndex: preferred_variant_index,
            version: version ?? undefined,
        });

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
