'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Plus } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty';
import { CreateApplicationDialog } from '@/components/application/create-dialog';
import { ApplicationListFilter, useApplicationFilters } from '@/components/application/list-filter';
import { ApplicationStatusBadge } from '@/components/application/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';

export default function AdminApplicationsPage() {
    const router = useRouter();
    const applications = useQuery(api.applications.crud.listAll);
    const [showCreate, setShowCreate] = React.useState(false);
    const { search, statusFilters, filteredApplications, setSearch, toggleStatus, selectAll } =
        useApplicationFilters(applications);

    if (applications === undefined) {
        return <div className="animate-pulse text-muted-foreground p-6">Loading service accounts...</div>;
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Service Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage application records, including plugin and internal accounts
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="mr-2 size-4" />
                    Create Service Account
                </Button>
            </div>

            {applications.length === 0 ? (
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
                    <ApplicationListFilter
                        search={search}
                        statusFilters={statusFilters}
                        onSearchChange={setSearch}
                        onToggleStatus={toggleStatus}
                        onSelectAll={selectAll}
                    />

                    {filteredApplications.length === 0 ? (
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
                                    <TableHead>Permissions</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredApplications.map((application) => (
                                    <TableRow
                                        key={application._id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/admin/applications/${application._id}`)}
                                    >
                                        <TableCell>
                                            <span className="font-medium">{application.name}</span>
                                            {application.description && (
                                                <p className="max-w-xs truncate text-sm text-muted-foreground">
                                                    {application.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {application.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <ApplicationStatusBadge status={application.status} />
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {application.permissions?.join(', ') || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(application.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </>
            )}

            <CreateApplicationDialog open={showCreate} onOpenChange={setShowCreate} />
        </div>
    );
}
