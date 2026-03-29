import Link from 'next/link';
import { fetchQuery } from 'convex/nextjs';
import { Plug, Users, Building2 } from 'lucide-react';
import { api } from '@convex/api';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminDashboardPage() {
    const auth = await withAuth();

    if (!auth.accessToken) {
        return null;
    }

    const [plugins, actors, sites] = await Promise.all([
        fetchQuery(api.plugins.applications.listAll, {}, { token: auth.accessToken }),
        fetchQuery(api.actors.listAll, {}, { token: auth.accessToken }),
        fetchQuery(api.sites.list, {}, { token: auth.accessToken }),
    ]);

    const activePlugins = plugins.filter((plugin) => plugin.status === 'active').length;
    const pendingPlugins = plugins.filter((plugin) => plugin.status === 'pending').length;
    const users = actors.filter((actor) => actor.type === 'user').length;

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Platform overview</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/plugins">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Plugins</CardTitle>
                            <Plug className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{plugins.length}</div>
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
                        <div className="text-2xl font-bold">{users}</div>
                        <CardDescription>Registered users</CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Sites</CardTitle>
                        <Building2 className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sites.length}</div>
                        <CardDescription>Active sites</CardDescription>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
