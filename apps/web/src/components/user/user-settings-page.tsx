'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field';
import { Switch } from '@workspace/ui/components/switch';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { ArrowLeft, Copy, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '@shared/api-client';

function getInitials(name?: string, email?: string): string {
    if (name) {
        const parts = name.split(' ').filter(Boolean);
        const first = parts[0];
        const last = parts.at(-1);
        if (first && last && parts.length >= 2) return (first.charAt(0) + last.charAt(0)).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() ?? '?';
}

export function UserSettingsPage() {
    const settings = useQuery(api.actors.getMyActorSettings);
    const [canBeFound, setCanBeFound] = React.useState(false);
    const [canBeInvited, setCanBeInvited] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (!settings) return;
        setCanBeFound(settings.canBeFoundInOrganization);
        setCanBeInvited(settings.canBeInvitedInOrganization);
    }, [settings]);

    const hasChanges =
        !!settings &&
        (canBeFound !== settings.canBeFoundInOrganization || canBeInvited !== settings.canBeInvitedInOrganization);

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await requestJson<{ ok: true }>(`/api/v2/actors/${settings.actor._id}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    canBeFoundInOrganization: canBeFound,
                    canBeInvitedInOrganization: canBeInvited,
                }),
            });
            toast.success('Settings saved');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const copyPublicId = async () => {
        if (!settings) return;
        await navigator.clipboard.writeText(settings.actor.publicId);
        toast.success('Public ID copied');
    };

    if (!settings) {
        return (
            <main className="flex h-full min-h-0 w-full flex-col overflow-auto bg-background">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </main>
        );
    }

    return (
        <main className="flex h-full min-h-0 w-full flex-col overflow-auto bg-background">
            <div className="border-b px-6 py-4">
                <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Settings className="size-4" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold">Settings</h1>
                            <p className="text-sm text-muted-foreground">Manage your profile visibility and invites.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" render={<Link href="/" />} nativeButton={false}>
                        <ArrowLeft className="size-3.5" />
                        Back to app
                    </Button>
                </div>
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>This is the account information connected to your session.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-4">
                            <Avatar className="size-14">
                                <AvatarImage src={settings.actor.avatarUrl ?? undefined} alt={settings.actor.name} />
                                <AvatarFallback>
                                    {getInitials(settings.actor.name, settings.actor.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0 flex-1 gap-3">
                                <Field>
                                    <FieldLabel>Name</FieldLabel>
                                    <p className="truncate text-sm">{settings.actor.name ?? 'Unnamed user'}</p>
                                </Field>
                                <Field>
                                    <FieldLabel>Email</FieldLabel>
                                    <p className="truncate text-sm">{settings.actor.email ?? 'No email'}</p>
                                </Field>
                                <Field>
                                    <FieldLabel>Public ID</FieldLabel>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">
                                            {settings.actor.publicId}
                                        </code>
                                        <Button type="button" variant="outline" size="icon-sm" onClick={copyPublicId}>
                                            <Copy className="size-3.5" />
                                            <span className="sr-only">Copy public ID</span>
                                        </Button>
                                    </div>
                                </Field>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Organization visibility</CardTitle>
                        <CardDescription>
                            Choose how people in your organization can find and invite you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                            <Field className="gap-1">
                                <FieldLabel>Visible in my organization</FieldLabel>
                                <FieldDescription>
                                    People with search access can find your public profile.
                                </FieldDescription>
                            </Field>
                            <Switch checked={canBeFound} onCheckedChange={setCanBeFound} />
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                            <Field className="gap-1">
                                <FieldLabel>Can receive site invites</FieldLabel>
                                <FieldDescription>
                                    Site admins can invite you when they know your public ID.
                                </FieldDescription>
                            </Field>
                            <Switch checked={canBeInvited} onCheckedChange={setCanBeInvited} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="border-t bg-background px-6 py-3">
                <div className="mx-auto flex w-full max-w-3xl justify-end">
                    <Button disabled={!hasChanges || isSaving} onClick={handleSave}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>
        </main>
    );
}
