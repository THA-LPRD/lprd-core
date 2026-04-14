'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { KeyRound, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { ReissueTokenDialog } from '@/components/application/reissue-dialog';
import { ConfirmActionDialog } from '@/components/application/confirm-action-dialog';
import type { Doc } from '@convex/dataModel';

export function ApplicationActions({ application }: { application: Doc<'applications'> }) {
    const router = useRouter();
    const updateStatus = useMutation(api.applications.crud.updateStatus);
    const permanentDelete = useMutation(api.applications.crud.permanentDelete);
    const [showReissue, setShowReissue] = React.useState(false);
    const [showSuspendConfirm, setShowSuspendConfirm] = React.useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
    const [showPermanentDelete, setShowPermanentDelete] = React.useState(false);

    return (
        <>
            <div className="flex gap-2">
                {application.status === 'active' && (
                    <>
                        <Button variant="outline" onClick={() => setShowReissue(true)}>
                            <KeyRound className="size-4 mr-2" />
                            Rotate Secret
                        </Button>
                        <Button variant="outline" onClick={() => setShowSuspendConfirm(true)}>
                            <Pause className="size-4 mr-2" />
                            Suspend
                        </Button>
                    </>
                )}
                {application.status === 'suspended' && (
                    <Button variant="outline" onClick={() => updateStatus({ id: application._id, status: 'active' })}>
                        <Play className="size-4 mr-2" />
                        Activate
                    </Button>
                )}
                {application.status !== 'removed' && (
                    <Button variant="destructive" onClick={() => setShowRemoveConfirm(true)}>
                        <Trash2 className="size-4 mr-2" />
                        Remove
                    </Button>
                )}
                {application.status === 'removed' && (
                    <Button variant="destructive" onClick={() => setShowPermanentDelete(true)}>
                        <Trash2 className="size-4 mr-2" />
                        Delete Permanently
                    </Button>
                )}
            </div>

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
                    await permanentDelete({ id: application._id });
                    router.push('/admin/applications');
                }}
            />
        </>
    );
}
