import { httpAction } from '../_generated/server';
import { makeFunctionReference } from 'convex/server';
import type { Id } from '../_generated/dataModel';
import type { TemplateVariant } from '../lib/template';

// Direct function references avoid traversing the full `internal` type tree,
// which would exceed TypeScript's type instantiation depth limit.
const getPluginByUuid = makeFunctionReference<
    'query',
    { uuid: string },
    { _id: Id<'plugins'> } | null
>('plugins/registration:getByUuid');

const upsertGlobal = makeFunctionReference<
    'mutation',
    {
        pluginId: Id<'plugins'>;
        name: string;
        description?: string;
        templateHtml: string;
        sampleData?: unknown;
        variants: TemplateVariant[];
        preferredVariantIndex: number;
        version?: string;
    },
    { created: boolean; id: Id<'templates'> }
>('templates/global:upsertGlobal');

/**
 * POST /api/v2/plugin/webhook/createTemplate
 * Creates or updates a global template for a plugin.
 * Plugin ID is read from the X-Plugin-Id header.
 */
export const handleCreateTemplate = httpAction(async (ctx, request) => {
    try {
        const pluginUuid = request.headers.get('X-Plugin-Id');
        if (!pluginUuid) {
            return new Response(JSON.stringify({ error: 'X-Plugin-Id header is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { name, description, template_html, sample_data, variants, preferred_variant_index, version } = body;

        if (!name || !template_html || !variants || preferred_variant_index === undefined) {
            return new Response(
                JSON.stringify({ error: 'name, template_html, variants, and preferred_variant_index are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const plugin = await ctx.runQuery(getPluginByUuid, { uuid: pluginUuid });
        if (!plugin) {
            return new Response(JSON.stringify({ error: 'Plugin not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await ctx.runMutation(upsertGlobal, {
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
        return new Response(JSON.stringify({ id: result.id }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Plugin createTemplate error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
