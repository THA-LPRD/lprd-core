import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { getConvexClient } from '@/lib/convex-server';
import { signPluginToken } from '@/lib/plugin/jwt';
import { asPublic } from '@/lib/convex-server';

/**
 * POST /api/v2/plugin/register
 * Plugin self-registration with one-time registration key.
 * Returns JWT token for subsequent API calls.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { registration_key, name, version, description, config_schema, base_url, topics } = body;

        if (!registration_key) {
            return NextResponse.json({ error: 'registration_key is required' }, { status: 400 });
        }

        if (!version || !base_url) {
            return NextResponse.json({ error: 'version and base_url are required' }, { status: 400 });
        }

        const convex = getConvexClient();

        // Find pending plugin with this key (plaintext match + expiry check)
        const plugin = await convex.query(asPublic(internal.plugins.admin.validateRegistrationKey), {
            registrationKey: registration_key,
        });

        if (!plugin || plugin.status !== 'pending') {
            return NextResponse.json({ error: 'Invalid registration key' }, { status: 401 });
        }

        // Generate JWT
        const { token, issuedAt } = await signPluginToken(plugin._id);

        // Generate internal IDs for each topic entry
        const topicsWithIds = Array.isArray(topics)
            ? topics.map((t: { key: string; label: string; description?: string }) => ({
                  id: crypto.randomUUID(),
                  key: t.key,
                  label: t.label,
                  description: t.description,
              }))
            : [];

        // Complete registration
        await convex.mutation(asPublic(internal.plugins.admin.completeRegistration), {
            pluginId: plugin._id,
            version,
            baseUrl: base_url,
            topics: topicsWithIds,
            description: description ?? name ?? undefined,
            configSchema: config_schema ?? undefined,
            tokenIssuedAt: issuedAt,
        });

        return NextResponse.json({ plugin_id: plugin._id, token }, { status: 201 });
    } catch (error) {
        console.error('Plugin registration error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}