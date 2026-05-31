'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAction, useMutation } from 'convex/react';
import { api } from '@convex/api';
import type { Doc } from '@convex/dataModel';
import { KeyRound, Pause, Play, Trash2 } from 'lucide-react';
import { isPluginApplication } from '@/lib/applications';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { ConfirmActionDialog } from '@/components/application/confirm-action-dialog';
import { ReissueTokenDialog } from '@/components/application/reissue-dialog';
import { ApplicationStatusBadge, PluginHealthBadge } from '@/components/application/status-badge';

type ApplicationWithOrganization = Doc<'applications'> & { organizationName?: string };

export function ApplicationDetailsCard({
    application,
    applicationPluginProfile,
}: {
    application: ApplicationWithOrganization;
    applicationPluginProfile?: Doc<'pluginProfiles'>;
}) {
    const router = useRouter();
    const updateStatus = useMutation(api.applications.crud.updateStatus);
    const deprovision = useAction(api.applications.provision.deprovision);
    const [showReissue, setShowReissue] = React.useState(false);
    const [showSuspendConfirm, setShowSuspendConfirm] = React.useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
    const [showPermanentDelete, setShowPermanentDelete] = React.useState(false);

    const isPlugin = isPluginApplication(application);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                    <CardAction>
                        <div className="flex gap-2">
                            {application.status === 'active' && (
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
                            {application.status === 'suspended' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStatus({ id: application._id, status: 'active' })}
                                >
                                    <Play className="size-4 mr-2" />
                                    Activate
                                </Button>
                            )}
                            {application.status !== 'removed' && (
                                <Button variant="destructive" size="sm" onClick={() => setShowRemoveConfirm(true)}>
                                    <Trash2 className="size-4 mr-2" />
                                    Remove
                                </Button>
                            )}
                            {application.status === 'removed' && (
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
                                <ApplicationStatusBadge status={application.status} />
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Type</dt>
                            <dd className="mt-1">
                                <Badge variant="outline" className="capitalize">
                                    {application.type}
                                </Badge>
                            </dd>
                        </div>
                        {isPlugin && (
                            <div>
                                <dt className="text-muted-foreground">Health</dt>
                                <dd className="mt-1">
                                    <PluginHealthBadge status={applicationPluginProfile?.healthStatus} />
                                </dd>
                            </div>
                        )}
                        {isPlugin && (
                            <div>
                                <dt className="text-muted-foreground">Version</dt>
                                <dd className="mt-1 font-mono">{applicationPluginProfile?.version}</dd>
                            </div>
                        )}
                        {isPlugin && applicationPluginProfile?.baseUrl && (
                            <div>
                                <dt className="text-muted-foreground">Base URL</dt>
                                <dd className="mt-1 font-mono">{applicationPluginProfile.baseUrl}</dd>
                            </div>
                        )}
                        {isPlugin && (applicationPluginProfile?.topics?.length ?? 0) > 0 && (
                            <div>
                                <dt className="text-muted-foreground">Topics</dt>
                                <dd className="mt-1 flex gap-1 flex-wrap">
                                    {applicationPluginProfile?.topics.map((topic) => (
                                        <Badge key={topic.key} variant="outline">
                                            {topic.label}
                                        </Badge>
                                    ))}
                                </dd>
                            </div>
                        )}
                        <div>
                            <dt className="text-muted-foreground">Permissions</dt>
                            <dd className="mt-1 flex gap-1 flex-wrap">
                                <span className="text-muted-foreground">All</span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Organization</dt>
                            <dd className="mt-1">
                                {application.organizationName ?? (
                                    <span className="font-mono text-xs break-all">
                                        {application.organizationId ?? 'Unassigned'}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Client ID</dt>
                            <dd className="mt-1 font-mono text-xs break-all">{application.workosClientId}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Created</dt>
                            <dd className="mt-1">{new Date(application.createdAt).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {showReissue && (
                <ReissueTokenDialog
                    open={showReissue}
                    onOpenChange={setShowReissue}
                    applicationId={application._id}
                    applicationName={application.name}
                />
            )}

            <ConfirmActionDialog
                open={showSuspendConfirm}
                onOpenChange={setShowSuspendConfirm}
                title="Suspend Service Account"
                description={`This will immediately block all API calls from "${application.name}" across all sites. You can reactivate it later.`}
                confirmLabel="Suspend"
                onConfirm={async () => {
                    await updateStatus({ id: application._id, status: 'suspended' });
                }}
            />

            <ConfirmActionDialog
                open={showRemoveConfirm}
                onOpenChange={setShowRemoveConfirm}
                title="Remove Service Account"
                description={`This will mark "${application.name}" as removed and block all API access. The record will remain for auditing.`}
                confirmLabel="Remove"
                onConfirm={async () => {
                    await updateStatus({ id: application._id, status: 'removed' });
                    router.push('/admin/applications');
                }}
            />

            <ConfirmActionDialog
                open={showPermanentDelete}
                onOpenChange={setShowPermanentDelete}
                title="Permanently Delete Service Account"
                description={`This will permanently delete "${application.name}" and ALL associated data including site attachments, permission grants, health check history, and templates. This cannot be undone.`}
                confirmLabel="Delete Permanently"
                onConfirm={async () => {
                    await deprovision({ id: application._id });
                    router.push('/admin/applications');
                }}
            />
        </>
    );
}
