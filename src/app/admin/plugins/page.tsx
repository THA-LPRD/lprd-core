'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PluginStatusBadge } from '@/components/plugin/status-badge';
import { PluginListFilter, usePluginFilters } from '@/components/plugin/plugin-list-filter';
import { CreatePluginDialog } from '@/components/plugin/create-dialog';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';

export default function AdminPluginsPage() {
    const router = useRouter();
    const plugins = useQuery(api.plugins.applications.listAll);
    const [showCreate, setShowCreate] = React.useState(false);
    const { search, statusFilters, filteredPlugins, setSearch, toggleStatus, selectAll } = usePluginFilters(plugins);

    if (plugins === undefined) {
        return <div className="animate-pulse text-muted-foreground p-6">Loading plugins...</div>;
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Service Accounts</h1>
                    <p className="text-muted-foreground">Manage plugin and internal service accounts</p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="size-4 mr-2" />
                    Create Service Account
                </Button>
            </div>

            {plugins.length === 0 ? (
                <Empty className="pt-24">
                    <EmptyHeader>
                        <button type="button" onClick={() => setShowCreate(true)} className="cursor-pointer">
                            <EmptyMedia variant="icon">
                                <Plus />
                            </EmptyMedia>
                        </button>
                        <EmptyTitle>No service accounts</EmptyTitle>
                        <EmptyDescription>Create one to get started.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <PluginListFilter
                        search={search}
                        statusFilters={statusFilters}
                        onSearchChange={setSearch}
                        onToggleStatus={toggleStatus}
                        onSelectAll={selectAll}
                    />

                    {filteredPlugins.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyTitle>No matching service accounts</EmptyTitle>
                                <EmptyDescription>Try adjusting your search or filter.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="w-28">Status</TableHead>
                                    <TableHead>Scopes</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPlugins.map((account) => (
                                    <TableRow
                                        key={account._id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/admin/plugins/${account._id}`)}
                                    >
                                        <TableCell>
                                            <span className="font-medium">{account.name}</span>
                                            {account.description && (
                                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                    {account.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {account.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <PluginStatusBadge status={account.status} />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {account.scopes?.join(', ') || '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(account.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </>
            )}

            <CreatePluginDialog open={showCreate} onOpenChange={setShowCreate} />
        </div>
    );
}
