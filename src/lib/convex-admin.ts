import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference, FunctionReturnType, FunctionVisibility } from 'convex/server';

type AdminConvexHttpClient = Omit<ConvexHttpClient, 'query' | 'mutation' | 'action'> & {
    setAdminAuth(token: string): void;
    query<Ref extends FunctionReference<'query', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
    mutation<Ref extends FunctionReference<'mutation', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
    action<Ref extends FunctionReference<'action', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
};

export const convexAdmin = new ConvexHttpClient(
    process.env.NEXT_PUBLIC_CONVEX_URL!,
) as unknown as AdminConvexHttpClient;

convexAdmin.setAdminAuth(process.env.CONVEX_DEPLOY_KEY!);
