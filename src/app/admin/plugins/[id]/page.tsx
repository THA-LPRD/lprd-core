'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PluginActions } from '@/components/plugin/plugin-actions';
import { PluginDetailsCard } from '@/components/plugin/plugin-details-card';
import { PluginRegKeyCard } from '@/components/plugin/plugin-reg-key-card';
import { PluginHealthCard } from '@/components/plugin/plugin-health-card';
import { PluginOrgAccessCard } from '@/components/plugin/plugin-org-access-card';
import type { Id } from '@convex/dataModel';

export default function PluginDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pluginId = params.id as Id<'plugins'>;
    const plugin = useQuery(api.plugins.admin.getDetails, { id: pluginId });

    if (plugin === undefined) {
        return <div className="animate-pulse text-muted-foreground p-6">Loading...</div>;
    }

    if (!plugin) {
        return <div className="text-muted-foreground p-6">Plugin not found</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="size-4 mr-1" />
                    Back
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{plugin.name}</h1>
                    {plugin.description && <p className="text-muted-foreground">{plugin.description}</p>}
                </div>
                <PluginActions plugin={plugin} />
            </div>

            <PluginDetailsCard plugin={plugin} />

            {plugin.status === 'pending' && plugin.registrationKey && plugin.registrationKeyExpiresAt && (
                <PluginRegKeyCard
                    registrationKey={plugin.registrationKey}
                    registrationKeyExpiresAt={plugin.registrationKeyExpiresAt}
                />
            )}

            <PluginHealthCard pluginId={plugin._id} />
            <PluginOrgAccessCard pluginId={plugin._id} />
        </div>
    );
}
