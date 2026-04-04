import { headers } from 'next/headers';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import { authenticateApplication, requireScope } from '@/lib/application/auth';

export async function getRenderPageToken() {
    const headerStore = await headers();
    const authorization = headerStore.get('authorization');

    if (authorization?.startsWith('Bearer ')) {
        const application = await authenticateApplication(
            new Request('http://local/render', { headers: { authorization } }),
            'internal',
        );
        requireScope(application, 'internal_render');
        return authorization.slice(7);
    }

    const auth = await withAuth();
    if (!auth.accessToken) {
        notFound();
    }

    return auth.accessToken;
}
