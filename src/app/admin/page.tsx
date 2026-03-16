'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import Link from 'next/link';
import { Plug, Users, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboardPage() {
    const plugins = useQuery(api.plugins.admin.listAll);
    const users = useQuery(api.users.listAll);
    const sites = useQuery(api.sites.list);

    const activePlugins = plugins?.filter((p) => p.status === 'active').length ?? 0;
    const pendingPlugins = plugins?.filter((p) => p.status === 'pending').length ?? 0;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Platform overview</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/plugins">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Plugins</CardTitle>
                            <Plug className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{plugins?.length ?? '-'}</div>
                            <CardDescription>
                                {activePlugins} active{pendingPlugins > 0 ? `, ${pendingPlugins} pending` : ''}
                            </CardDescription>
                        </CardContent>
                    </Card>
                </Link>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Users</CardTitle>
                        <Users className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users?.length ?? '-'}</div>
                        <CardDescription>Registered users</CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Sites</CardTitle>
                        <Building2 className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sites?.length ?? '-'}</div>
                        <CardDescription>Active sites</CardDescription>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
