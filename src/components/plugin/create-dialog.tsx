'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
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
import { Copy, Check } from 'lucide-react';

const KEY_TTL_OPTIONS = [
    { label: '15 minutes', value: String(15 * 60 * 1000) },
    { label: '1 hour', value: String(60 * 60 * 1000) },
    { label: '2 hours', value: String(2 * 60 * 60 * 1000) },
    { label: '3 hours', value: String(3 * 60 * 60 * 1000) },
    { label: '6 hours', value: String(6 * 60 * 60 * 1000) },
    { label: '12 hours', value: String(12 * 60 * 60 * 1000) },
    { label: '24 hours', value: String(24 * 60 * 60 * 1000) },
];

const KEY_TTL_LABEL_MAP = new Map(KEY_TTL_OPTIONS.map((o) => [o.value, o.label]));

export function CreatePluginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [scopePushData, setScopePushData] = React.useState(true);
    const [scopeCreateTemplate, setScopeCreateTemplate] = React.useState(true);
    const [keyTtlMs, setKeyTtlMs] = React.useState(String(2 * 60 * 60 * 1000)); // default 2h
    const [isCreating, setIsCreating] = React.useState(false);
    const [registrationKey, setRegistrationKey] = React.useState<string | null>(null);
    const [copied, setCopied] = React.useState(false);

    const createSlot = useMutation(api.plugins.admin.createPluginSlot);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsCreating(true);
        try {
            const scopes: Array<'push_data' | 'create_template'> = [];
            if (scopePushData) scopes.push('push_data');
            if (scopeCreateTemplate) scopes.push('create_template');

            const result = await createSlot({
                name: name.trim(),
                description: description.trim() || undefined,
                scopes: scopes.length > 0 ? scopes : undefined,
                keyTtlMs: Number(keyTtlMs),
            });
            setRegistrationKey(result.registrationKey);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = async () => {
        if (!registrationKey) return;
        await navigator.clipboard.writeText(registrationKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setName('');
            setDescription('');
            setScopePushData(true);
            setScopeCreateTemplate(true);
            setKeyTtlMs(String(2 * 60 * 60 * 1000));
            setRegistrationKey(null);
            setCopied(false);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{registrationKey ? 'Plugin Created' : 'Create Plugin'}</DialogTitle>
                    <DialogDescription>
                        {registrationKey
                            ? 'The registration key is shown below. You can also find it on the plugin detail page until it expires or is used.'
                            : 'Create a plugin slot. The plugin will self-register using the key.'}
                    </DialogDescription>
                </DialogHeader>

                {registrationKey ? (
                    <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">{registrationKey}</div>
                        <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
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
                        <p className="text-sm text-muted-foreground">
                            The key will expire based on the duration you selected.
                        </p>
                    </div>
                ) : (
                    <FieldGroup>
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Plugin" />
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
                                    <Checkbox checked={scopePushData} onCheckedChange={(c) => setScopePushData(!!c)} />
                                    Push Data
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={scopeCreateTemplate}
                                        onCheckedChange={(c) => setScopeCreateTemplate(!!c)}
                                    />
                                    Create Template
                                </label>
                            </div>
                        </Field>
                        <Field>
                            <FieldLabel>Key Expiry</FieldLabel>
                            <Select value={keyTtlMs} onValueChange={(v) => v && setKeyTtlMs(v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue>{KEY_TTL_LABEL_MAP.get(keyTtlMs) ?? keyTtlMs}</SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {KEY_TTL_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>
                )}

                <DialogFooter>
                    {registrationKey ? (
                        <Button onClick={() => handleClose(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                                {isCreating ? 'Creating...' : 'Create'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
