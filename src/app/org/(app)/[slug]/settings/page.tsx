'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { MemberTable } from '@/components/org/member-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessDenied } from '@/components/ui/not-found';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Save, Trash2 } from 'lucide-react';
import { useOrg } from '@/components/org/org-context';
import { OrgPluginSettings } from '@/components/plugin/org-settings';

export default function OrgSettingsPage() {
    const router = useRouter();

    const { org, user, members, permissions } = useOrg();

    // Form state
    const [orgName, setOrgName] = React.useState(org.name);
    const [isSaving, setIsSaving] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [deleteConfirm, setDeleteConfirm] = React.useState('');
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Mutations
    const updateOrg = useMutation(api.organizations.update);
    const deleteOrg = useMutation(api.organizations.remove);

    // Sync org name when it changes externally
    React.useEffect(() => {
        setOrgName(org.name);
    }, [org.name]);

    const handleSaveSettings = async () => {
        if (!orgName.trim()) return;

        setIsSaving(true);
        try {
            await updateOrg({
                id: org._id,
                name: orgName.trim(),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteOrg = async () => {
        if (deleteConfirm !== org.name) return;

        setIsDeleting(true);
        try {
            await deleteOrg({ id: org._id });
            router.push('/');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!permissions.org.manage) {
        return <AccessDenied />;
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage organization settings and members</p>
            </div>

            <div className="space-y-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>General</CardTitle>
                        <CardDescription>Basic organization information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Organization Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="org-name"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="max-w-md"
                                />
                                <Button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving || orgName === org.name || !orgName.trim()}
                                >
                                    <Save className="size-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Slug</Label>
                            <p className="text-sm text-muted-foreground">{org.slug}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Members */}
                <Card>
                    <CardHeader>
                        <CardTitle>Members</CardTitle>
                        <CardDescription>People who have access to this organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MemberTable
                            members={members}
                            organizationId={org._id}
                            currentUserId={user._id}
                            canManage={permissions.org.manage}
                        />
                    </CardContent>
                </Card>

                {/* Plugins */}
                {permissions.plugin.orgManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Plugins</CardTitle>
                            <CardDescription>Enable or disable plugins for this organization</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OrgPluginSettings organizationId={org._id} />
                        </CardContent>
                    </Card>
                )}

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>Irreversible actions that affect the entire organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                            <div>
                                <p className="font-medium">Delete Organization</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete this organization and all its data
                                </p>
                            </div>
                            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                <Trash2 className="size-4 mr-2" />
                                Delete Organization
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Organization</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the organization
                            <strong> {org.name}</strong>, all devices, and remove all members.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="confirm-delete">
                            Type <strong>{org.name}</strong> to confirm
                        </Label>
                        <Input
                            id="confirm-delete"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder={org.name}
                            className="mt-2"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setDeleteConfirm('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteOrg}
                            disabled={isDeleting || deleteConfirm !== org.name}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Organization'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
