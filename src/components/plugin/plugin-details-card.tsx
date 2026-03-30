'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { KeyRound, Pause, Play, Trash2 } from 'lucide-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PluginHealthBadge, PluginStatusBadge } from '@/components/plugin/status-badge';
import { ReissueTokenDialog } from '@/components/plugin/reissue-dialog';
import { ConfirmActionDialog } from '@/components/plugin/confirm-action-dialog';
import type { Doc } from '@convex/dataModel';

export function PluginDetailsCard({
    plugin,
    pluginMetadata,
}: {
    plugin: Doc<'applications'> & { organizationName?: string };
    pluginMetadata?: Doc<'pluginProfiles'>;
}) {
    const router = useRouter();
    const updateStatus = useMutation(api.plugins.applications.updateStatus);
    const permanentDelete = useMutation(api.plugins.applications.permanentDelete);
    const [showReissue, setShowReissue] = React.useState(false);
    const [showSuspendConfirm, setShowSuspendConfirm] = React.useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
    const [showPermanentDelete, setShowPermanentDelete] = React.useState(false);

    const isPlugin = plugin.type === 'plugin';

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                    <CardAction>
                        <div className="flex gap-2">
                            {plugin.status === 'active' && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => setShowReissue(true)}>
                                        <KeyRound className="size-4 mr-2" />
                                        Rotate Secret
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setShowSuspendConfirm(true)}>
                                        <Pause className="size-4 mr-2" />
                                        Suspend
                                    </Button>
                                </>
                            )}
                            {plugin.status === 'suspended' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStatus({ id: plugin._id, status: 'active' })}
                                >
                                    <Play className="size-4 mr-2" />
                                    Activate
                                </Button>
                            )}
                            {plugin.status !== 'removed' && (
                                <Button variant="destructive" size="sm" onClick={() => setShowRemoveConfirm(true)}>
                                    <Trash2 className="size-4 mr-2" />
                                    Remove
                                </Button>
                            )}
                            {plugin.status === 'removed' && (
                                <Button variant="destructive" size="sm" onClick={() => setShowPermanentDelete(true)}>
                                    <Trash2 className="size-4 mr-2" />
                                    Delete Permanently
                                </Button>
                            )}
                        </div>
                    </CardAction>
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
                            <dt className="text-muted-foreground">Type</dt>
                            <dd className="mt-1">
                                <Badge variant="outline" className="capitalize">
                                    {plugin.type}
                                </Badge>
                            </dd>
                        </div>
                        {isPlugin && (
                            <div>
                                <dt className="text-muted-foreground">Health</dt>
                                <dd className="mt-1">
                                    <PluginHealthBadge status={pluginMetadata?.healthStatus} />
                                </dd>
                            </div>
                        )}
                        {isPlugin && (
                            <div>
                                <dt className="text-muted-foreground">Version</dt>
                                <dd className="mt-1 font-mono">{pluginMetadata?.version}</dd>
                            </div>
                        )}
                        {isPlugin && pluginMetadata?.baseUrl && (
                            <div>
                                <dt className="text-muted-foreground">Base URL</dt>
                                <dd className="mt-1 font-mono">{pluginMetadata.baseUrl}</dd>
                            </div>
                        )}
                        {isPlugin && (pluginMetadata?.topics?.length ?? 0) > 0 && (
                            <div>
                                <dt className="text-muted-foreground">Topics</dt>
                                <dd className="mt-1 flex gap-1 flex-wrap">
                                    {pluginMetadata!.topics.map((t) => (
                                        <Badge key={t.key} variant="outline">
                                            {t.label}
                                        </Badge>
                                    ))}
                                </dd>
                            </div>
                        )}
                        <div>
                            <dt className="text-muted-foreground">Scopes</dt>
                            <dd className="mt-1 flex gap-1 flex-wrap">
                                {plugin.scopes?.map((s) => (
                                    <Badge key={s} variant="secondary">
                                        {s}
                                    </Badge>
                                )) ?? <span className="text-muted-foreground">All</span>}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Organization</dt>
                            <dd className="mt-1">
                                {plugin.organizationName ?? (
                                    <span className="font-mono text-xs break-all">{plugin.organizationId ?? 'Unassigned'}</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Client ID</dt>
                            <dd className="mt-1 font-mono text-xs break-all">{plugin.workosClientId}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Created</dt>
                            <dd className="mt-1">{new Date(plugin.createdAt).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {showReissue && (
                <ReissueTokenDialog
                    open={showReissue}
                    onOpenChange={setShowReissue}
                    pluginId={plugin._id}
                    pluginName={plugin.name}
                />
            )}

            <ConfirmActionDialog
                open={showSuspendConfirm}
                onOpenChange={setShowSuspendConfirm}
                title="Suspend Service Account"
                description={`This will immediately block all API calls from "${plugin.name}" across all sites. You can reactivate it later.`}
                confirmLabel="Suspend"
                onConfirm={async () => {
                    await updateStatus({ id: plugin._id, status: 'suspended' });
                }}
            />

            <ConfirmActionDialog
                open={showRemoveConfirm}
                onOpenChange={setShowRemoveConfirm}
                title="Remove Service Account"
                description={`This will mark "${plugin.name}" as removed and block all API access. The record will remain for auditing.`}
                confirmLabel="Remove"
                onConfirm={async () => {
                    await updateStatus({ id: plugin._id, status: 'removed' });
                    router.push('/admin/plugins');
                }}
            />

            <ConfirmActionDialog
                open={showPermanentDelete}
                onOpenChange={setShowPermanentDelete}
                title="Permanently Delete Service Account"
                description={`This will permanently delete "${plugin.name}" and all associated data including site access records, health check history, and templates. This cannot be undone.`}
                confirmLabel="Delete Permanently"
                onConfirm={async () => {
                    await permanentDelete({ id: plugin._id });
                    router.push('/admin/plugins');
                }}
            />
        </>
    );
}
