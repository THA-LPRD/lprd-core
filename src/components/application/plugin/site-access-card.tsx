'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { Id } from '@convex/dataModel';

export function PluginSiteAccessCard({ pluginId }: { pluginId: Id<'applications'> }) {
    const sites = useQuery(api.applications.plugin.siteAccess.listForPlugin, { pluginId });
    const setAdminAccess = useMutation(api.applications.plugin.siteAccess.setAdminAccess);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Site Access</CardTitle>
                <CardDescription>
                    Control which sites can use this plugin. Toggle &quot;Admin Enabled&quot; to allow/block a site.
                    Site admins independently toggle their own access.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {sites === undefined ? (
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                ) : sites.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sites found.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Site</TableHead>
                                <TableHead>Admin Enabled</TableHead>
                                <TableHead>Site Enabled</TableHead>
                                <TableHead>Effective</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sites.map((site) => (
                                <TableRow key={site._id}>
                                    <TableCell>
                                        <div>
                                            <span className="font-medium">{site.name}</span>
                                            <span className="text-muted-foreground ml-2 text-sm">{site.slug}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={site.enabledByAdmin}
                                            onCheckedChange={(checked) =>
                                                setAdminAccess({
                                                    pluginId,
                                                    siteId: site._id,
                                                    enabled: checked,
                                                })
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={site.enabledBySite ? 'default' : 'secondary'}>
                                            {site.enabledBySite ? 'Yes' : 'No'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                site.enabledByAdmin && site.enabledBySite ? 'default' : 'secondary'
                                            }
                                        >
                                            {site.enabledByAdmin && site.enabledBySite ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
