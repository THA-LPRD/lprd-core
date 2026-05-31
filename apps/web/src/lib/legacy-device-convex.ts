import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference, FunctionReturnType, FunctionVisibility } from 'convex/server';

export type LegacyDeviceConvexClient = Omit<ConvexHttpClient, 'query' | 'mutation'> & {
    setAdminAuth(token: string): void;
    query<Ref extends FunctionReference<'query', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
    mutation<Ref extends FunctionReference<'mutation', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
};

function getRequiredEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

export function createLegacyDeviceConvexClient(): LegacyDeviceConvexClient {
    const convex = new ConvexHttpClient(
        getRequiredEnv('NEXT_PUBLIC_CONVEX_URL'),
    ) as unknown as LegacyDeviceConvexClient;
    convex.setAdminAuth(getRequiredEnv('CONVEX_DEPLOY_KEY'));
    return convex;
}
