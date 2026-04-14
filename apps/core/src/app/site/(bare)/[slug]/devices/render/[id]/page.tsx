import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { notFound } from 'next/navigation';
import { AuthError } from '@shared/auth-errors';
import { permissionCatalog } from '@/lib/permissions';
import { DeviceRenderClient } from '@/components/render/device-render-client';
import { requireAuthorization } from '@/lib/authz';

export default async function DeviceRenderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let token: string;

    try {
        const authorization = await requireAuthorization();
        if (authorization.application && !authorization.can(permissionCatalog.org.site.device.view)) {
            notFound();
        }
        token = authorization.accessToken;
    } catch (error) {
        if (error instanceof AuthError) {
            notFound();
        }
        throw error;
    }

    const bundle = await fetchQuery(api.devices.render.getRenderBundle, { deviceId: id as Id<'devices'> }, { token });

    if (!bundle) notFound();

    return <DeviceRenderClient bundle={bundle} />;
}
