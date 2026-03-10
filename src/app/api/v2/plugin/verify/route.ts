import { NextResponse } from 'next/server';
import { authenticatePlugin, AuthError } from '@/lib/plugin/auth';

/**
 * GET /api/v2/plugin/verify
 * Plugins can call this to check if their token is valid and they are active.
 * Returns plugin info on success, 401/403 on failure.
 */
export async function GET(request: Request) {
    try {
        const plugin = await authenticatePlugin(request);

        return NextResponse.json({
            plugin_id: plugin._id,
            name: plugin.name,
            status: plugin.status,
            scopes: plugin.scopes ?? null,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}