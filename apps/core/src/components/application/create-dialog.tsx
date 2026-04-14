'use client';

import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { useAction, useQuery } from 'convex/react';
import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { type ApplicationPermission, getServiceAccountDefaultPermissions, permissionCatalog } from '@/lib/permissions';

type ProvisionedCredentials = {
    applicationId: string;
    clientId: string;
    clientSecret: string;
};

function getProvisionPermissions(input: {
    type: 'plugin' | 'internal';
    pluginDataWrite: boolean;
    organizationTemplateUpsert: boolean;
}): ApplicationPermission[] | undefined {
    if (input.type === 'internal') return undefined;

    const permissions = new Set(getServiceAccountDefaultPermissions('plugin'));

    if (!input.pluginDataWrite) {
        permissions.delete(permissionCatalog.org.site.pluginData.manage.self);
        permissions.delete(permissionCatalog.org.site.device.manage.job.enqueue);
    }

    if (!input.organizationTemplateUpsert) {
        permissions.delete(permissionCatalog.org.template.manage.upsert.self);
        permissions.delete(permissionCatalog.org.template.manage.upsert.job.enqueue);
    }

    return [...permissions] as ApplicationPermission[];
}

export function CreateApplicationDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const organizations = useQuery(api.organizations.list);
    const provision = useAction(api.applications.provision.provision);
    const [type, setType] = React.useState<'plugin' | 'internal'>('plugin');
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [organizationId, setOrganizationId] = React.useState<Id<'organizations'> | ''>('');
    const [scopePushData, setScopePushData] = React.useState(true);
    const [scopeCreateTemplate, setScopeCreateTemplate] = React.useState(true);
    const [isCreating, setIsCreating] = React.useState(false);
    const [credentials, setCredentials] = React.useState<ProvisionedCredentials | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const selectedOrganizationName =
        organizations?.find((organization) => organization._id === organizationId)?.name ?? '';

    React.useEffect(() => {
        if (!open || organizations === undefined) return;
        setOrganizationId((current) => current || organizations[0]?._id || '');
    }, [open, organizations]);

    const handleCreate = async () => {
        if (!name.trim() || !organizationId) return;
        const actorName = name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        setIsCreating(true);
        setError(null);
        try {
            const permissions = getProvisionPermissions({
                type,
                pluginDataWrite: scopePushData,
                organizationTemplateUpsert: scopeCreateTemplate,
            });

            const data = await provision({
                type,
                name: name.trim(),
                actorName,
                description: description.trim() || undefined,
                organizationId,
                permissions,
            });

            setCredentials({
                applicationId: data.applicationId,
                clientId: data.clientId,
                clientSecret: data.clientSecret,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create service account');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = async () => {
        if (!credentials) return;
        await navigator.clipboard.writeText(credentials.clientSecret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            setType('plugin');
            setName('');
            setDescription('');
            setScopePushData(true);
            setScopeCreateTemplate(true);
            setCredentials(null);
            setCopied(false);
            setError(null);
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{credentials ? 'Service Account Created' : 'Create Service Account'}</DialogTitle>
                    <DialogDescription>
                        {credentials
                            ? 'Save the client secret below. It will not be shown again.'
                            : 'Create a service account with M2M credentials.'}
                    </DialogDescription>
                </DialogHeader>

                {credentials ? (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Client ID</p>
                            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                                {credentials.clientId}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Client Secret</p>
                            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                                {credentials.clientSecret}
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
                            {copied ? (
                                <>
                                    <Check className="size-4 mr-2" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="size-4 mr-2" />
                                    Copy Client Secret
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <FieldGroup>
                        <Field>
                            <FieldLabel>Type</FieldLabel>
                            <Select value={type} onValueChange={(value) => setType(value as 'plugin' | 'internal')}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    <SelectItem value="plugin">Plugin</SelectItem>
                                    <SelectItem value="internal">Internal</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Render Worker"
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Organization</FieldLabel>
                            <Select
                                value={organizationId || undefined}
                                onValueChange={(value) =>
                                    setOrganizationId((value as Id<'organizations'> | null) ?? '')
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select organization">
                                        {selectedOrganizationName || undefined}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {organizations?.map((organization) => (
                                        <SelectItem key={organization._id} value={organization._id}>
                                            {organization.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Description</FieldLabel>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                            />
                        </Field>
                        {type === 'plugin' ? (
                            <Field>
                                <FieldLabel>Permissions</FieldLabel>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            aria-label="Push Data"
                                            checked={scopePushData}
                                            onCheckedChange={(c) => setScopePushData(c)}
                                        />
                                        Push Data
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            aria-label="Upsert Organization Templates"
                                            checked={scopeCreateTemplate}
                                            onCheckedChange={(c) => setScopeCreateTemplate(c)}
                                        />
                                        Upsert Organization Templates
                                    </div>
                                </div>
                            </Field>
                        ) : (
                            <Field>
                                <FieldLabel>Permissions</FieldLabel>
                                <p className="text-sm text-muted-foreground">
                                    Internal service accounts receive their worker permissions automatically.
                                </p>
                            </Field>
                        )}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </FieldGroup>
                )}

                <DialogFooter>
                    {credentials ? (
                        <Button onClick={() => handleClose(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={isCreating || !name.trim() || !organizationId}>
                                {isCreating ? 'Creating...' : 'Create'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
