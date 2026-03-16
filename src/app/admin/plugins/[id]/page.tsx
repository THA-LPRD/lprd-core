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
import { PluginSiteAccessCard } from '@/components/plugin/plugin-site-access-card';
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
        <div className="flex h-full flex-col overflow-hidden p-6">
            {/* Header */}
            <div className="flex-shrink-0 space-y-6 pb-6">
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
            </div>

            {/* Small viewport: stacked scroll */}
            <div className="flex-1 space-y-6 overflow-y-auto lg:hidden">
                <PluginDetailsCard plugin={plugin} />

                {plugin.status === 'pending' && plugin.registrationKey && plugin.registrationKeyExpiresAt && (
                    <PluginRegKeyCard
                        registrationKey={plugin.registrationKey}
                        registrationKeyExpiresAt={plugin.registrationKeyExpiresAt}
                    />
                )}

                <PluginSiteAccessCard pluginId={plugin._id} />
                <PluginHealthCard pluginId={plugin._id} />
            </div>

            {/* Large viewport: two-column layout */}
            <div className="hidden flex-1 gap-6 overflow-hidden lg:flex">
                {/* Left column: metadata top, permissions bottom (scrollable) */}
                <div className="flex w-1/2 flex-col gap-6 overflow-hidden">
                    <div className="flex-shrink-0 space-y-6">
                        <PluginDetailsCard plugin={plugin} />

                        {plugin.status === 'pending' && plugin.registrationKey && plugin.registrationKeyExpiresAt && (
                            <PluginRegKeyCard
                                registrationKey={plugin.registrationKey}
                                registrationKeyExpiresAt={plugin.registrationKeyExpiresAt}
                            />
                        )}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <PluginSiteAccessCard pluginId={plugin._id} />
                    </div>
                </div>

                {/* Right column: health log (scrollable) */}
                <div className="w-1/2 overflow-y-auto">
                    <PluginHealthCard pluginId={plugin._id} />
                </div>
            </div>
        </div>
    );
}
