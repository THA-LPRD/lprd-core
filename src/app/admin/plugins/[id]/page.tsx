'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@convex/api';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, KeyRound, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { PluginHealthBadge, PluginStatusBadge } from '@/components/plugin/status-badge';
import { ReissueTokenDialog } from '@/components/plugin/reissue-dialog';
import { Badge } from '@/components/ui/badge';
import type { Id } from '@convex/dataModel';

export default function PluginDetailPage() {
    const params = useParams();
    const pluginId = params.id as Id<'plugins'>;

    const plugin = useQuery(api.plugins.admin.getDetails, { id: pluginId });
    const router = useRouter();
    const orgs = useQuery(api.plugins.orgAccess.listForPlugin, { pluginId });
    const { results: healthChecks, status: healthPagination, loadMore } = usePaginatedQuery(
        api.plugins.health.listByPlugin,
        { pluginId },
        { initialNumItems: 20 },
    );
    const setAdminAccess = useMutation(api.plugins.orgAccess.setAdminAccess);
    const updateStatus = useMutation(api.plugins.admin.updateStatus);
    const [showReissue, setShowReissue] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const handleCopyKey = async () => {
        if (!plugin?.registrationKey) return;
        await navigator.clipboard.writeText(plugin.registrationKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const keyExpired = plugin?.registrationKeyExpiresAt ? Date.now() > plugin.registrationKeyExpiresAt : false;

    if (plugin === undefined) {
        return <div className="animate-pulse text-muted-foreground">Loading...</div>;
    }

    if (!plugin) {
        return <div className="text-muted-foreground">Plugin not found</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" render={<Link href="/admin/plugins" />} nativeButton={false}>
                    <ArrowLeft className="size-4 mr-1" />
                    Back
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{plugin.name}</h1>
                    {plugin.description && <p className="text-muted-foreground">{plugin.description}</p>}
                </div>
                <div className="flex gap-2">
                    {plugin.status === 'active' && (
                        <>
                            <Button variant="outline" onClick={() => setShowReissue(true)}>
                                <KeyRound className="size-4 mr-2" />
                                Reissue Token
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => updateStatus({ id: pluginId, status: 'suspended' })}
                            >
                                <Pause className="size-4 mr-2" />
                                Suspend
                            </Button>
                        </>
                    )}
                    {plugin.status === 'suspended' && (
                        <Button variant="outline" onClick={() => updateStatus({ id: pluginId, status: 'active' })}>
                            <Play className="size-4 mr-2" />
                            Activate
                        </Button>
                    )}
                    {plugin.status !== 'removed' && (
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                await updateStatus({ id: pluginId, status: 'removed' });
                                router.push('/admin/plugins');
                            }}
                        >
                            <Trash2 className="size-4 mr-2" />
                            Remove
                        </Button>
                    )}
                </div>
            </div>

            {/* Plugin Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-muted-foreground">Status</dt>
                            <dd className="mt-1">
                                <PluginStatusBadge status={plugin.status} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Health</dt>
                            <dd className="mt-1">
                                <PluginHealthBadge status={plugin.healthStatus} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Version</dt>
                            <dd className="mt-1 font-mono">{plugin.version}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Base URL</dt>
                            <dd className="mt-1 font-mono">{plugin.baseUrl || '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Scopes</dt>
                            <dd className="mt-1 flex gap-1">
                                {plugin.scopes?.map((s) => (
                                    <Badge key={s} variant="secondary">
                                        {s}
                                    </Badge>
                                )) ?? <span className="text-muted-foreground">All</span>}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Topics</dt>
                            <dd className="mt-1 flex gap-1 flex-wrap">
                                {plugin.topics.length > 0
                                    ? plugin.topics.map((t) => (
                                          <Badge key={t.id} variant="outline">
                                              {t.label}
                                          </Badge>
                                      ))
                                    : '-'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Created</dt>
                            <dd className="mt-1">{new Date(plugin.createdAt).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {/* Registration Key (pending plugins only) */}
            {plugin.status === 'pending' && plugin.registrationKey && (
                <Card>
                    <CardHeader>
                        <CardTitle>Registration Key</CardTitle>
                        <CardDescription>
                            {keyExpired
                                ? 'This key has expired. Remove the plugin and create a new one.'
                                : `Expires ${new Date(plugin.registrationKeyExpiresAt!).toLocaleString()}. The plugin must register before this time.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                            {plugin.registrationKey}
                        </div>
                        {!keyExpired && (
                            <Button variant="outline" size="sm" onClick={handleCopyKey} className="w-full">
                                {copied ? (
                                    <>
                                        <Check className="size-4 mr-2" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="size-4 mr-2" />
                                        Copy Registration Key
                                    </>
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Health Checks */}
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

            {/* Org Access */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Access</CardTitle>
                    <CardDescription>
                        Control which organizations can use this plugin. Toggle &quot;Admin Enabled&quot; to allow/block
                        an org. OrgAdmins independently toggle their own access.
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

            {showReissue && (
                <ReissueTokenDialog
                    open={showReissue}
                    onOpenChange={setShowReissue}
                    pluginId={pluginId}
                    pluginName={plugin.name}
                />
            )}
        </div>
    );
}
