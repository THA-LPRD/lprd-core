import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { notFound } from 'next/navigation';
import { AuthError } from '@shared/auth-errors';
import { permissionCatalog } from '@/lib/permissions';
import { FrameRenderClient } from '@/components/render/frame-render-client';
import { requireAuthorization } from '@/lib/authz';

export default async function FrameRenderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let token: string;

    try {
        const authorization = await requireAuthorization();
        if (authorization.application && !authorization.can(permissionCatalog.org.site.frame.view)) {
            notFound();
        }
        token = authorization.accessToken;
    } catch (error) {
        if (error instanceof AuthError) {
            notFound();
        }
        throw error;
    }

    const bundle = await fetchQuery(api.frames.getRenderBundle, { frameId: id as Id<'frames'> }, { token });

    if (!bundle) notFound();

    return <FrameRenderClient bundle={bundle} />;
}
