'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PluginStatusBadge, PluginHealthBadge } from '@/components/plugin/status-badge';
import { CreatePluginDialog } from '@/components/plugin/create-dialog';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';

export default function AdminPluginsPage() {
    const router = useRouter();
    const plugins = useQuery(api.plugins.admin.listAll);
    const [showCreate, setShowCreate] = React.useState(false);

    if (plugins === undefined) {
        return <div className="animate-pulse text-muted-foreground p-6">Loading plugins...</div>;
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Plugins</h1>
                    <p className="text-muted-foreground">Manage platform plugins</p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="size-4 mr-2" />
                    Create Plugin
                </Button>
            </div>

            {plugins.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Plus />
                        </EmptyMedia>
                        <EmptyTitle>No plugins</EmptyTitle>
                        <EmptyDescription>Create a plugin slot to get started.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Health</TableHead>
                            <TableHead>Version</TableHead>
                            <TableHead>Base URL</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plugins.map((plugin) => (
                            <TableRow
                                key={plugin._id}
                                className="cursor-pointer"
                                onClick={() => router.push(`/admin/plugins/${plugin._id}`)}
                            >
                                <TableCell>
                                    <span className="font-medium">{plugin.name}</span>
                                    {plugin.description && (
                                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                                            {plugin.description}
                                        </p>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <PluginStatusBadge status={plugin.status} />
                                </TableCell>
                                <TableCell>
                                    <PluginHealthBadge status={plugin.healthStatus} />
                                </TableCell>
                                <TableCell className="text-muted-foreground">{plugin.version}</TableCell>
                                <TableCell className="text-muted-foreground text-sm truncate max-w-xs">
                                    {plugin.baseUrl || '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <CreatePluginDialog open={showCreate} onOpenChange={setShowCreate} />
        </div>
    );
}
