'use client';

import { useMutation, usePaginatedQuery } from 'convex/react';
import { api } from '@convex/api';
import { Button } from '@workspace/ui/components/button';
import { Switch } from '@workspace/ui/components/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty';
import { Plug } from 'lucide-react';
import type { Id } from '@convex/dataModel';

export function SitePluginInstallations({ siteId }: { siteId: Id<'sites'> }) {
    const { results, status, loadMore } = usePaginatedQuery(
        api.actors.listForSiteSelection,
        {
            siteId,
            filters: {
                actorType: 'serviceAccount',
                applicationType: 'plugin',
            },
        },
        { initialNumItems: 20 },
    );
    const attachActor = useMutation(api.siteActors.attachActor);
    const removeActor = useMutation(api.siteActors.removeActor);

    if (status === 'LoadingFirstPage') {
        return <div className="animate-pulse text-muted-foreground">Loading plugins...</div>;
    }

    if (results.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Plug />
                    </EmptyMedia>
                    <EmptyTitle>No plugins available</EmptyTitle>
                    <EmptyDescription>No active plugins are available in this organization.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Plugin</TableHead>
                        <TableHead>Enabled</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map((item) => {
                        if (!item.application) return null;

                        return (
                            <TableRow key={item.application._id}>
                                <TableCell>
                                    <div>
                                        <span className="font-medium">{item.application.name}</span>
                                        {item.application.description && (
                                            <p className="text-sm text-muted-foreground">
                                                {item.application.description}
                                            </p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={item.installed}
                                        disabled={!item.installed && !item.canInvite}
                                        onCheckedChange={(checked) =>
                                            checked
                                                ? attachActor({
                                                      siteId,
                                                      actorId: item.actor._id,
                                                  })
                                                : removeActor({
                                                      siteId,
                                                      actorId: item.actor._id,
                                                  })
                                        }
                                    />
                                    {!item.installed && !item.canInvite && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Not currently eligible for installation.
                                        </p>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {status === 'CanLoadMore' && (
                <div className="flex justify-center">
                    <Button variant="outline" onClick={() => loadMore(20)}>
                        Load more
                    </Button>
                </div>
            )}
        </div>
    );
}
