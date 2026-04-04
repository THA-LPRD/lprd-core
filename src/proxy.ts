import { authkitProxy } from '@workos-inc/authkit-nextjs';

export default authkitProxy({
    eagerAuth: true,
    middlewareAuth: {
        enabled: true,
        unauthenticatedPaths: [
            // Public pages
            '/',
            '/login',
            '/sign-in',
            '/sign-up',
            // Device API (MAC-based auth)
            '/api/v1/displays/:mac*',
            '/api/v1/displays/config/:mac*',
            // Bearer token routes — these authenticate via M2M JWT in route handlers,
            // not via AuthKit session cookies. They must be listed here so the middleware
            // doesn't redirect Bearer requests to the login page.
            '/api/v2/plugin/:path*',
            '/api/v2/jobs',
            '/api/v2/jobs/:path*',
            '/api/v2/worker/:path*',
            '/site/:slug/templates/render/:id',
            '/site/:slug/frames/render/:id',
            '/site/:slug/devices/render/:id',
        ],
    },
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
