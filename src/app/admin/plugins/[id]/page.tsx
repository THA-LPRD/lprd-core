'use client';

import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { PluginDetail } from '@/components/plugin/plugin-detail';
import type { Id } from '@convex/dataModel';

export default function PluginDetailPage() {
    const params = useParams();
    const pluginId = params.id as Id<'plugins'>;
    const plugin = useQuery(api.plugins.admin.getDetails, { id: pluginId });

    if (plugin === undefined) {
        return <div className="animate-pulse text-muted-foreground">Loading...</div>;
    }

    if (!plugin) {
        return <div className="text-muted-foreground">Plugin not found</div>;
    }

    return <PluginDetail plugin={plugin} />;
}
