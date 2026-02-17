import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v2/plugin/register
 * Registers a new plugin. Returns 201 with { registration_id }.
 */
export const handlePluginRegister = httpAction(async (ctx, request) => {
    try {
        const body = await request.json();

        const { name, version, description, config_schema, base_url } = body;
        if (!name || !version || !base_url) {
            return new Response(JSON.stringify({ error: 'name, version, and base_url are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const id = uuidv4();
        const result = await ctx.runMutation(internal.plugins.registration.registerPlugin, {
            id,
            name,
            version,
            description: description ?? undefined,
            configSchema: config_schema ?? undefined,
            baseUrl: base_url,
        });

        const status = result.alreadyExists ? 200 : 201;
        return new Response(JSON.stringify({ registration_id: result.id }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Plugin registration error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
