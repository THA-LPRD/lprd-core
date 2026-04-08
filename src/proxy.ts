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
            '/api/v2/applications/:applicationId/health-check',
            '/api/v2/applications/jobs/:jobId/start',
            '/api/v2/applications/jobs/:jobId/fail',
            '/api/v2/devices/:deviceId/render',
            '/api/v2/devices/jobs/:jobId/start',
            '/api/v2/devices/jobs/:jobId/fail',
            '/api/v2/frames/:frameId/thumbnail',
            '/api/v2/frames/jobs/:jobId/start',
            '/api/v2/frames/jobs/:jobId/fail',
            '/api/v2/plugin/:path*',
            '/api/v2/plugin-data/:pluginDataId/data',
            '/api/v2/plugin-data/jobs/:jobId/start',
            '/api/v2/plugin-data/jobs/:jobId/fail',
            '/api/v2/templates/:templateId/thumbnail',
            '/api/v2/templates/:templateId/sample-data',
            '/api/v2/templates/jobs/:jobId/start',
            '/api/v2/templates/jobs/:jobId/fail',
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
