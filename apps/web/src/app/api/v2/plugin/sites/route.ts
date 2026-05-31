import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '@convex/api';
import { AuthError } from '@shared/auth-errors';
import { requireAuthorization } from '@/lib/authz';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(value: string | null) {
    if (!value) return DEFAULT_LIMIT;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_LIMIT;
    }

    return Math.min(parsed, MAX_LIMIT);
}

/**
 * GET /api/v2/plugin/sites
 * Lists the sites the current plugin is installed on and can still access.
 */
export async function GET(request: Request) {
    try {
        const authorization = await requireAuthorization({ request });
        if (!authorization.application) {
            throw new AuthError('Application not found', 401);
        }
        if (authorization.application.type !== 'plugin') {
            throw new AuthError(`Application type '${authorization.application.type}' is not allowed here`, 403);
        }

        const url = new URL(request.url);
        const result = await fetchQuery(
            api.applications.plugin.sites.listInstalled,
            {
                paginationOpts: {
                    cursor: url.searchParams.get('cursor'),
                    numItems: parseLimit(url.searchParams.get('limit')),
                },
            },
            { token: authorization.accessToken },
        );

        return NextResponse.json({
            items: result.page,
            next_cursor: result.isDone ? null : result.continueCursor,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }

        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
