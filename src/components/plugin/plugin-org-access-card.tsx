'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { Id } from '@convex/dataModel';

export function PluginOrgAccessCard({ pluginId }: { pluginId: Id<'plugins'> }) {
    const orgs = useQuery(api.plugins.orgAccess.listForPlugin, { pluginId });
    const setAdminAccess = useMutation(api.plugins.orgAccess.setAdminAccess);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organization Access</CardTitle>
                <CardDescription>
                    Control which organizations can use this plugin. Toggle &quot;Admin Enabled&quot; to allow/block an
                    org. OrgAdmins independently toggle their own access.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {orgs === undefined ? (
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                ) : orgs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No organizations found.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Admin Enabled</TableHead>
                                <TableHead>Org Enabled</TableHead>
                                <TableHead>Effective</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orgs.map((org) => (
                                <TableRow key={org._id}>
                                    <TableCell>
                                        <div>
                                            <span className="font-medium">{org.name}</span>
                                            <span className="text-muted-foreground ml-2 text-sm">{org.slug}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={org.enabledByAdmin}
                                            onCheckedChange={(checked) =>
                                                setAdminAccess({
                                                    pluginId,
                                                    organizationId: org._id,
                                                    enabled: !!checked,
                                                })
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={org.enabledByOrg ? 'default' : 'secondary'}>
                                            {org.enabledByOrg ? 'Yes' : 'No'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                org.enabledByAdmin && org.enabledByOrg ? 'default' : 'secondary'
                                            }
                                        >
                                            {org.enabledByAdmin && org.enabledByOrg ? 'Active' : 'Inactive'}
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
