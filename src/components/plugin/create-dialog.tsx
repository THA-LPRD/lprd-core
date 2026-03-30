'use client';

import * as React from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Copy } from 'lucide-react';

type ProvisionedCredentials = {
    applicationId: string;
    clientId: string;
    clientSecret: string;
};

export function CreatePluginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const organizations = useQuery(api.organizations.listAll);
    const provision = useAction(api.plugins.provision.provision);
    const [type, setType] = React.useState<'plugin' | 'internal'>('plugin');
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [organizationId, setOrganizationId] = React.useState<Id<'organizations'> | ''>('');
    const [scopePushData, setScopePushData] = React.useState(true);
    const [scopeCreateTemplate, setScopeCreateTemplate] = React.useState(true);
    const [scopeInternalRender, setScopeInternalRender] = React.useState(false);
    const [isCreating, setIsCreating] = React.useState(false);
    const [credentials, setCredentials] = React.useState<ProvisionedCredentials | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const selectedOrganizationName = organizations?.find((organization) => organization._id === organizationId)?.name ?? '';

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
            const scopes: Array<'push_data' | 'create_template' | 'internal_render'> = [];
            if (scopePushData) scopes.push('push_data');
            if (scopeCreateTemplate) scopes.push('create_template');
            if (scopeInternalRender) scopes.push('internal_render');

            const data = await provision({
                type,
                name: name.trim(),
                actorName,
                description: description.trim() || undefined,
                organizationId,
                scopes: scopes.length > 0 ? scopes : undefined,
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
            setScopeInternalRender(false);
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
                                onValueChange={(value) => setOrganizationId((value as Id<'organizations'> | null) ?? '')}
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
                        <Field>
                            <FieldLabel>Scopes</FieldLabel>
                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={scopePushData} onCheckedChange={(c) => setScopePushData(c)} />
                                    Push Data
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={scopeCreateTemplate}
                                        onCheckedChange={(c) => setScopeCreateTemplate(c)}
                                    />
                                    Create Template
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={scopeInternalRender}
                                        onCheckedChange={(c) => setScopeInternalRender(c)}
                                    />
                                    Internal Render
                                </label>
                            </div>
                        </Field>
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
