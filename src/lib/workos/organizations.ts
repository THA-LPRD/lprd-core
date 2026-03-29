import { workosRequest } from '@/lib/workos/shared';

export async function list() {
    const result = await workosRequest<{ data: Array<{ id: string; name: string }> }>('/organizations');
    return result.data;
}
