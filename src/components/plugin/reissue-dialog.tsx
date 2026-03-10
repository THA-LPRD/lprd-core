'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Check } from 'lucide-react';
import type { Id } from '@convex/dataModel';

export function ReissueTokenDialog({
    open,
    onOpenChange,
    pluginId,
    pluginName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pluginId: Id<'plugins'>;
    pluginName: string;
}) {
    const [isReissuing, setIsReissuing] = React.useState(false);
    const [token, setToken] = React.useState<string | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleReissue = async () => {
        setIsReissuing(true);
        setError(null);
        try {
            const res = await fetch('/api/v2/plugin/reissue-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pluginId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reissue token');
            }
            const data = await res.json();
            setToken(data.token);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reissue token');
        } finally {
            setIsReissuing(false);
        }
    };

    const handleCopy = async () => {
        if (!token) return;
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setToken(null);
            setCopied(false);
            setError(null);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{token ? 'New Token Issued' : 'Reissue Token'}</DialogTitle>
                    <DialogDescription>
                        {token
                            ? 'Save the new token below. The old token has been invalidated.'
                            : `This will invalidate the current token for "${pluginName}". The plugin will need to be updated with the new token.`}
                    </DialogDescription>
                </DialogHeader>

                {token ? (
                    <div className="space-y-3">
                        <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all max-h-32 overflow-y-auto">
                            {token}
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
                                    Copy Token
                                </>
                            )}
                        </Button>
                        <p className="text-sm text-destructive">
                            This token cannot be retrieved later. Make sure to copy it now.
                        </p>
                    </div>
                ) : (
                    <>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </>
                )}

                <DialogFooter>
                    {token ? (
                        <Button onClick={() => handleClose(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleReissue} disabled={isReissuing}>
                                {isReissuing ? 'Reissuing...' : 'Reissue Token'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
