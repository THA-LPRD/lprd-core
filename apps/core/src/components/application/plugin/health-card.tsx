'use client';

import { usePaginatedQuery } from 'convex/react';
import { api } from '@convex/api';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { Badge } from '@workspace/ui/components/badge';
import type { Id } from '@convex/dataModel';

export function PluginHealthCard({ pluginId }: { pluginId: Id<'applications'> }) {
    const {
        results: healthChecks,
        status: healthPagination,
        loadMore,
    } = usePaginatedQuery(api.applications.plugin.health.listByPlugin, { pluginId }, { initialNumItems: 20 });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Health Checks</CardTitle>
                <CardDescription>Recent health check results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {healthPagination === 'LoadingFirstPage' ? (
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                ) : healthChecks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No health checks recorded yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Response Time</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Error</TableHead>
                                <TableHead>Checked At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {healthChecks.map((check) => (
                                <TableRow key={check._id}>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                check.status === 'healthy'
                                                    ? 'default'
                                                    : check.status === 'unhealthy'
                                                      ? 'outline'
                                                      : 'destructive'
                                            }
                                        >
                                            {check.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {check.responseTimeMs != null ? `${check.responseTimeMs}ms` : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono">
                                        {check.pluginVersion ?? '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                                        {check.errorMessage ?? '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(check.checkedAt).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {healthPagination === 'CanLoadMore' && (
                    <div className="flex justify-center">
                        <Button variant="outline" onClick={() => loadMore(20)}>
                            Load more
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
