'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import type { Id } from '@convex/dataModel';

export function PluginOrganizationAvailabilityCard({ actorId }: { actorId: Id<'actors'> }) {
    const organizations = useQuery(api.siteActors.getOrganizationAvailability, { actorId });
    const sites = useQuery(api.siteActors.getSiteAvailability, { actorId });
    const setOrganizationAvailability = useMutation(api.siteActors.setOrganizationAvailability);
    const setSiteAvailability = useMutation(api.siteActors.setSiteAvailability);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Organization Availability</CardTitle>
                    <CardDescription>
                        Organization allowance is mandatory. If it is off here, site settings cannot override it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {organizations === undefined ? (
                        <div className="animate-pulse text-muted-foreground">Loading...</div>
                    ) : organizations.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No organizations found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead>Invitable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.map((organization) => (
                                    <TableRow key={organization._id}>
                                        <TableCell>
                                            <span className="font-medium">{organization.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={organization.canView}
                                                onCheckedChange={(checked) =>
                                                    setOrganizationAvailability({
                                                        actorId,
                                                        organizationId: organization._id,
                                                        canView: checked,
                                                        canInvite: organization.canInvite,
                                                    })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={organization.canInvite}
                                                onCheckedChange={(checked) =>
                                                    setOrganizationAvailability({
                                                        actorId,
                                                        organizationId: organization._id,
                                                        canView: organization.canView,
                                                        canInvite: checked,
                                                    })
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Site Availability</CardTitle>
                    <CardDescription>
                        Site-level allowance is also required. A site admin only sees or installs this plugin when both
                        organization and site toggles are enabled.
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
                                    <TableHead>Visible</TableHead>
                                    <TableHead>Invitable</TableHead>
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
                                                checked={site.canView}
                                                onCheckedChange={(checked) =>
                                                    setSiteAvailability({
                                                        actorId,
                                                        siteId: site._id,
                                                        canView: checked,
                                                        canInvite: site.canInvite,
                                                    })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={site.canInvite}
                                                onCheckedChange={(checked) =>
                                                    setSiteAvailability({
                                                        actorId,
                                                        siteId: site._id,
                                                        canView: site.canView,
                                                        canInvite: checked,
                                                    })
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
