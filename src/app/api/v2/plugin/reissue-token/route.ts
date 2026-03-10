import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { asPublic, getConvexClient } from '@/lib/convex-server';
import { signPluginToken } from '@/lib/plugin/jwt';

/**
 * POST /api/v2/plugin/reissue-token
 * Reissue a JWT token for a plugin. Authenticated via WorkOS middleware.
 * The Convex mutation checks appAdmin authorization.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pluginId } = body;

        if (!pluginId) {
            return NextResponse.json({ error: 'pluginId is required' }, { status: 400 });
        }

        const convex = getConvexClient();

        // Sign the new JWT
        const { token, issuedAt } = await signPluginToken(pluginId);

        // Update tokenIssuedAt to invalidate old tokens
        await convex.mutation(asPublic(internal.plugins.admin.updateTokenIssuedAt), {
            pluginId,
            tokenIssuedAt: issuedAt,
        });

        return NextResponse.json({ token });
    } catch (error) {
        console.error('Token reissue error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
