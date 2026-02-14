import { ConvexHttpClient } from 'convex/browser';
import { config } from '@worker/config';

if (!config.convex.url) {
    throw new Error('CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) is required');
}
if (!config.convex.deployKey) {
    throw new Error('CONVEX_DEPLOY_KEY is required');
}

export const convexClient = new ConvexHttpClient(config.convex.url);
convexClient.setAdminAuth(config.convex.deployKey);
