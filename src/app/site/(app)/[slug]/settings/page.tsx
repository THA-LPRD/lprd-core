'use client';

import * as React from 'react';
import type { Id } from '@convex/dataModel';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { MemberTable } from '@/components/site/member-table';
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
import { useSite } from '@/providers/site-provider';
import { SitePluginSettings } from '@/components/application/plugin/site-settings';

export default function SiteSettingsPage() {
    const router = useRouter();

    const { site, actor, members, permissions } = useSite();

    // Form state
    const [siteName, setSiteName] = React.useState(site.name);
    const [isSaving, setIsSaving] = React.useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [deleteConfirm, setDeleteConfirm] = React.useState('');
    const [isDeleting, setIsDeleting] = React.useState(false);

    // Mutations
    const updateSite = useMutation(api.sites.update);
    const deleteSite = useMutation(api.sites.remove);

    // Sync site name when it changes externally
    React.useEffect(() => {
        setSiteName(site.name);
    }, [site.name]);

    const handleSaveSettings = async () => {
        if (!siteName.trim()) return;

        setIsSaving(true);
        try {
            await updateSite({
                id: site._id,
                name: siteName.trim(),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSite = async () => {
        if (deleteConfirm !== site.name) return;

        setIsDeleting(true);
        try {
            await deleteSite({ id: site._id });
            router.push('/');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!permissions.site.manage) {
        return <AccessDenied />;
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage site settings and members</p>
            </div>

            <div className="space-y-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>General</CardTitle>
                        <CardDescription>Basic site information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="site-name">Site Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="site-name"
                                    value={siteName}
                                    onChange={(e) => setSiteName(e.target.value)}
                                    className="max-w-md"
                                />
                                <Button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving || siteName === site.name || !siteName.trim()}
                                >
                                    <Save className="size-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Slug</Label>
                            <p className="text-sm text-muted-foreground">{site.slug}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Members */}
                <Card>
                    <CardHeader>
                        <CardTitle>Members</CardTitle>
                        <CardDescription>People who have access to this site</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MemberTable
                            members={members}
                            siteId={site._id}
                            currentActorId={actor._id as Id<'actors'>}
                            canManage={permissions.site.manage}
                        />
                    </CardContent>
                </Card>

                {/* Plugins */}
                {permissions.plugin.siteManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Plugins</CardTitle>
                            <CardDescription>Enable or disable plugins for this site</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SitePluginSettings siteId={site._id} />
                        </CardContent>
                    </Card>
                )}

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>Irreversible actions that affect the entire site</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                            <div>
                                <p className="font-medium">Delete Site</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete this site and all its data
                                </p>
                            </div>
                            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                <Trash2 className="size-4 mr-2" />
                                Delete Site
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Site</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the site
                            <strong> {site.name}</strong>, all devices, and remove all members.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="confirm-delete">
                            Type <strong>{site.name}</strong> to confirm
                        </Label>
                        <Input
                            id="confirm-delete"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            placeholder={site.name}
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
                            onClick={handleDeleteSite}
                            disabled={isDeleting || deleteConfirm !== site.name}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Site'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
