import { WorkOS } from '@workos-inc/node';
import { getWorkOSApiKey } from '@/lib/workos/shared';

export async function list() {
    const workos = new WorkOS(getWorkOSApiKey());
    const result = await workos.organizations.listOrganizations();
    return result.data;
}
