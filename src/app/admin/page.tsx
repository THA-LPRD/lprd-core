import Link from 'next/link';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { Building2, Plug, Users } from 'lucide-react';
import { api } from '@convex/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { permissionCatalog } from '@/lib/permissions';
import { requireAuthorization } from '@/lib/authz';

export default async function AdminDashboardPage() {
    const session = await requireAuthorization({ redirectTo: '/login' });

    if (!session.can(permissionCatalog.platform.actor.manage)) {
        redirect('/site');
    }

    const [applications, actors, sites] = await Promise.all([
        fetchQuery(api.applications.crud.listAll, {}, { token: session.accessToken }),
        fetchQuery(api.actors.listAll, {}, { token: session.accessToken }),
        fetchQuery(api.sites.list, {}, { token: session.accessToken }),
    ]);

    const activeApplications = applications.filter((application) => application.status === 'active').length;
    const pendingApplications = applications.filter((application) => application.status === 'pending').length;
    const users = actors.filter((actor) => actor.type === 'user').length;

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Platform overview</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/applications">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
                            <Plug className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{applications.length}</div>
                            <CardDescription>
                                {activeApplications} active
                                {pendingApplications > 0 ? `, ${pendingApplications} pending` : ''}
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
