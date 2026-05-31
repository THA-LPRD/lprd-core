'use client';

import * as React from 'react';
import type { Id } from '@convex/dataModel';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { MemberTable } from '@/components/site/member-table';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Field, FieldLabel } from '@workspace/ui/components/field';
import { AccessDenied } from '@/components/ui/not-found';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { Trash2 } from 'lucide-react';
import { useSite } from '@/providers/site-provider';
import { SitePluginInstallations } from '@/components/application/plugin/site-installations';
import { DeviceWakePolicyForm } from '@/components/device/device-wake-policy-form';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { ScrollArea } from '@workspace/ui/components/scroll-area';

type ActiveTab = 'general' | 'wake-policy' | 'members' | 'plugins';

export default function SiteSettingsPage() {
    const router = useRouter();
    const { site, actor, members, permissions } = useSite();

    const [activeTab, setActiveTab] = React.useState<ActiveTab>('general');

    // General tab state
    const [siteName, setSiteName] = React.useState(site.name);

    // Wake policy tab state
    const [deviceWakePolicy, setDeviceWakePolicy] = React.useState(site.deviceWakePolicy);

    // Saving states
    const [isSavingGeneral, setIsSavingGeneral] = React.useState(false);
    const [isSavingWakePolicy, setIsSavingWakePolicy] = React.useState(false);

    // Delete dialog
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [deleteConfirm, setDeleteConfirm] = React.useState('');
    const [isDeleting, setIsDeleting] = React.useState(false);

    const updateSite = useMutation(api.sites.update);
    const deleteSite = useMutation(api.sites.remove);

    React.useEffect(() => {
        setSiteName(site.name);
        setDeviceWakePolicy(site.deviceWakePolicy);
    }, [site.name, site.deviceWakePolicy]);

    const hasGeneralChanges = siteName !== site.name;
    const hasWakePolicyChanges = JSON.stringify(site.deviceWakePolicy) !== JSON.stringify(deviceWakePolicy);

    const handleSaveGeneral = async () => {
        if (!siteName.trim()) return;
        setIsSavingGeneral(true);
        try {
            await updateSite({ id: site._id, name: siteName.trim(), deviceWakePolicy: site.deviceWakePolicy });
            toast.success('Settings saved');
        } finally {
            setIsSavingGeneral(false);
        }
    };

    const handleSaveWakePolicy = async () => {
        setIsSavingWakePolicy(true);
        try {
            await updateSite({ id: site._id, name: site.name, deviceWakePolicy });
            toast.success('Wake policy saved');
        } finally {
            setIsSavingWakePolicy(false);
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

    if (!permissions.org.site.manage) {
        return <AccessDenied />;
    }

    const tabs: { id: ActiveTab; label: string }[] = [
        { id: 'general', label: 'General' },
        { id: 'wake-policy', label: 'Wake policy' },
        { id: 'members', label: 'Members' },
        ...(permissions.org.site.actor.manage ? [{ id: 'plugins' as ActiveTab, label: 'Plugins' }] : []),
    ];

    const isSaving = isSavingGeneral || isSavingWakePolicy;
    const hasSaveableTab = activeTab === 'general' || activeTab === 'wake-policy';
    const hasChanges = activeTab === 'general' ? hasGeneralChanges : hasWakePolicyChanges;
    const handleSave = activeTab === 'general' ? handleSaveGeneral : handleSaveWakePolicy;

    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ActiveTab)}
            className="h-full min-h-0 gap-0"
        >
            {/* Sticky header */}
            <div className="shrink-0 bg-background border-b">
                <div className="px-6 pt-4 pb-0">
                    <p className="text-sm font-semibold">Settings</p>
                    <p className="text-xs text-muted-foreground">Manage site settings and members</p>
                </div>

                <TabsList variant="line" className="mt-3 h-auto w-full justify-start gap-6 px-6 py-0">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="h-auto flex-none rounded-none px-0 pb-3 pt-0 after:bottom-[-1px] data-active:font-medium"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
                <TabsContent value="general" className="max-w-lg space-y-5 px-6 py-6">
                    <Field>
                        <FieldLabel htmlFor="site-name">Site name</FieldLabel>
                        <Input id="site-name" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                    </Field>

                    <Field>
                        <FieldLabel>Slug</FieldLabel>
                        <p className="text-sm text-muted-foreground">{site.slug}</p>
                    </Field>

                    {permissions.org.site.manage && (
                        <div className="border-t pt-5 mt-2">
                            <p className="text-sm font-medium text-destructive">Delete site</p>
                            <p className="text-sm text-muted-foreground mt-1 mb-3">
                                Permanently deletes this site, all devices, and removes all members.
                            </p>
                            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                                <Trash2 className="size-3.5 mr-1.5" />
                                Delete site
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="wake-policy" className="max-w-2xl px-6 py-6">
                    <DeviceWakePolicyForm value={deviceWakePolicy} onChange={setDeviceWakePolicy} />
                </TabsContent>

                <TabsContent value="members" className="px-6 min-h-full py-6">
                    <MemberTable
                        members={members}
                        siteId={site._id}
                        currentActorId={actor._id as Id<'actors'>}
                        canManage={permissions.org.site.actor.manage}
                    />
                </TabsContent>

                {permissions.org.site.actor.manage && (
                    <TabsContent value="plugins" className="px-6 py-6">
                        <SitePluginInstallations siteId={site._id} />
                    </TabsContent>
                )}
            </ScrollArea>

            {/* Sticky footer — only for tabs with saveable state */}
            {hasSaveableTab && (
                <div className="shrink-0 border-t bg-background px-6 py-3 flex justify-end">
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges || (activeTab === 'general' && !siteName.trim())}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            )}

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete site</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{site.name}</strong>, all devices, and remove all
                            members.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <FieldLabel htmlFor="confirm-delete">
                            Type <strong>{site.name}</strong> to confirm
                        </FieldLabel>
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
                            {isDeleting ? 'Deleting…' : 'Delete site'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Tabs>
    );
}
