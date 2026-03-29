'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PluginDetailsCard } from '@/components/plugin/plugin-details-card';

import { PluginHealthCard } from '@/components/plugin/plugin-health-card';
import { PluginSiteAccessCard } from '@/components/plugin/plugin-site-access-card';
import type { Id } from '@convex/dataModel';

export default function PluginDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pluginId = params.id as Id<'applications'>;
    const plugin = useQuery(api.plugins.applications.getDetails, { id: pluginId });
    const pluginMetadata = useQuery(
        api.plugins.applications.getPluginMetadata,
        plugin?.type === 'plugin' ? { id: pluginId } : 'skip',
    );

    if (plugin === undefined) {
        return <div className="animate-pulse text-muted-foreground p-6">Loading...</div>;
    }

    if (!plugin) {
        return <div className="text-muted-foreground p-6">Service account not found</div>;
    }

    const isPlugin = plugin.type === 'plugin';

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

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{plugin.name}</h1>
                    {plugin.description && <p className="text-muted-foreground">{plugin.description}</p>}
                </div>
            </div>

            {isPlugin ? (
                <>
                    {/* Small viewport: stacked scroll */}
                    <div className="flex-1 space-y-6 overflow-y-auto lg:hidden">
                        <PluginDetailsCard plugin={plugin} pluginMetadata={pluginMetadata ?? undefined} />
                        <PluginSiteAccessCard pluginId={plugin._id} />
                        <PluginHealthCard pluginId={plugin._id} />
                    </div>

                    {/* Large viewport: two-column layout */}
                    <div className="hidden flex-1 gap-6 overflow-hidden lg:flex">
                        <div className="flex w-1/2 flex-col gap-6 overflow-hidden">
                            <div className="flex-shrink-0">
                                <PluginDetailsCard plugin={plugin} pluginMetadata={pluginMetadata ?? undefined} />
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <PluginSiteAccessCard pluginId={plugin._id} />
                            </div>
                        </div>

                        <div className="w-1/2 overflow-y-auto">
                            <PluginHealthCard pluginId={plugin._id} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="max-w-2xl">
                    <PluginDetailsCard plugin={plugin} />
                </div>
            )}
        </div>
    );
}
