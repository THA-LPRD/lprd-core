'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Plug } from 'lucide-react';
import type { Id } from '@convex/dataModel';

export function SitePluginSettings({ siteId }: { siteId: Id<'sites'> }) {
    const plugins = useQuery(api.applications.plugin.siteAccess.listForSite, { siteId });
    const toggleAccess = useMutation(api.applications.plugin.siteAccess.toggleSiteAccess);

    if (plugins === undefined) {
        return <div className="animate-pulse text-muted-foreground">Loading plugins...</div>;
    }

    if (plugins.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Plug />
                    </EmptyMedia>
                    <EmptyTitle>No plugins available</EmptyTitle>
                    <EmptyDescription>
                        No plugins have been configured for this site by the platform admin.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Plugin</TableHead>
                    <TableHead>Enabled</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {plugins.map((plugin) => (
                    <TableRow key={plugin._id}>
                        <TableCell>
                            <div>
                                <span className="font-medium">{plugin.name}</span>
                                {plugin.description && (
                                    <p className="text-sm text-muted-foreground">{plugin.description}</p>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Switch
                                checked={plugin.enabledBySite}
                                onCheckedChange={(checked) =>
                                    toggleAccess({
                                        pluginId: plugin._id,
                                        siteId,
                                        enabled: checked,
                                    })
                                }
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
