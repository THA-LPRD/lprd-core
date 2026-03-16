import { type NextFetchEvent, type NextRequest } from 'next/server';
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { verifyPluginToken } from '@/lib/plugin/jwt';

const workosMiddleware = authkitMiddleware({
    eagerAuth: true,
    middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: [
            '/',
            '/login',
            '/sign-in',
            '/sign-up',
            '/api/v1/displays/:mac*',
            '/api/v1/displays/config/:mac*',
        ],
    },
});

/**
 * Permissive WorkOS middleware that treats all paths as unauthenticated.
 * Used for service-auth requests so AuthKitProvider/withAuth doesn't throw,
 * while still setting the internal headers that WorkOS components expect.
 */
const workosPassthroughMiddleware = authkitMiddleware({
    middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: ['/:path*'],
    },
});

/**
 * Check if the request carries a valid service-level auth token.
 * Two token types:
 *   - internal:<secret>  — symmetric secret for server-to-server calls (Playwright, workers)
 *   - plugin:<jwt>       — ES256 plugin JWT (signature check only, no DB lookup in middleware)
 */
async function hasServiceAuth(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    const token = authHeader.slice(7);

    if (token.startsWith('internal:')) {
        const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
        return !!serviceToken && token.slice(9) === serviceToken;
    }

    if (token.startsWith('plugin:')) {
        try {
            await verifyPluginToken(token.slice(7));
            return true;
        } catch {
            return false;
        }
    }

    return false;
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
    if (await hasServiceAuth(request)) {
        return workosPassthroughMiddleware(request, event);
    }
    return workosMiddleware(request, event);
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
