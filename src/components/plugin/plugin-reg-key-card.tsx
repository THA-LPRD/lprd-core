'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PluginRegKeyCardProps {
    clientId: string;
}

export function PluginRegKeyCard({ clientId }: PluginRegKeyCardProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopyKey = async () => {
        await navigator.clipboard.writeText(clientId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Credentials</CardTitle>
                <CardDescription>The client secret is only shown when created or rotated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Client ID</p>
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">{clientId}</div>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyKey} className="w-full">
                    {copied ? (
                        <>
                            <Check className="size-4 mr-2" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="size-4 mr-2" />
                            Copy Client ID
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
