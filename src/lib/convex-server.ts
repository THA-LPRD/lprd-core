import { ConvexHttpClient } from 'convex/browser';

let client: ConvexHttpClient | null = null;

/**
 * Singleton ConvexHttpClient with admin auth for server-side use.
 * Uses CONVEX_DEPLOY_KEY for internal function access.
 */
export function getConvexClient(): ConvexHttpClient {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    const deployKey = process.env.CONVEX_DEPLOY_KEY;

    if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is required');
    if (!deployKey) throw new Error('CONVEX_DEPLOY_KEY is required');

    client = new ConvexHttpClient(url);
    client.setAdminAuth(deployKey);
    return client;
}
