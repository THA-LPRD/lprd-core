'use client';

import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Button } from '@workspace/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { useAction } from 'convex/react';
import { Check, Copy } from 'lucide-react';
import * as React from 'react';

export function ReissueTokenDialog({
    open,
    onOpenChange,
    applicationId,
    applicationName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    applicationId: Id<'applications'>;
    applicationName: string;
}) {
    const rotateSecret = useAction(api.applications.provision.rotateSecret);
    const [isReissuing, setIsReissuing] = React.useState(false);
    const [secret, setSecret] = React.useState<{ clientId: string; clientSecret: string } | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleReissue = async () => {
        setIsReissuing(true);
        setError(null);
        try {
            const data = await rotateSecret({ id: applicationId });
            setSecret({ clientId: data.clientId, clientSecret: data.clientSecret });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create client secret');
        } finally {
            setIsReissuing(false);
        }
    };

    const handleCopy = async () => {
        if (!secret) return;
        await navigator.clipboard.writeText(secret.clientSecret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setSecret(null);
            setCopied(false);
            setError(null);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{secret ? 'New Client Secret' : 'Rotate Client Secret'}</DialogTitle>
                    <DialogDescription>
                        {secret
                            ? 'Save the client secret below. It will not be shown again.'
                            : `This will create a new client secret for "${applicationName}".`}
                    </DialogDescription>
                </DialogHeader>

                {secret ? (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Client ID</p>
                            <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">{secret.clientId}</div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Client Secret</p>
                            <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all max-h-32 overflow-y-auto">
                                {secret.clientSecret}
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
                        <p className="text-sm text-destructive">
                            This secret cannot be retrieved later. Make sure to copy it now.
                        </p>
                    </div>
                ) : error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}

                <DialogFooter>
                    {secret ? (
                        <Button onClick={() => handleClose(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleReissue} disabled={isReissuing}>
                                {isReissuing ? 'Creating...' : 'Create New Secret'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
