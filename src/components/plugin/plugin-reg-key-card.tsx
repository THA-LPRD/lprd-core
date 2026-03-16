'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PluginRegKeyCardProps {
    registrationKey: string;
    registrationKeyExpiresAt: number;
}

export function PluginRegKeyCard({ registrationKey, registrationKeyExpiresAt }: PluginRegKeyCardProps) {
    const [copied, setCopied] = React.useState(false);
    const [keyExpired] = React.useState(() => Date.now() > registrationKeyExpiresAt);

    const handleCopyKey = async () => {
        await navigator.clipboard.writeText(registrationKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registration Key</CardTitle>
                <CardDescription>
                    {keyExpired
                        ? 'This key has expired. Remove the plugin and create a new one.'
                        : `Expires ${new Date(registrationKeyExpiresAt).toLocaleString()}. The plugin must register before this time.`}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">{registrationKey}</div>
                {!keyExpired && (
                    <Button variant="outline" size="sm" onClick={handleCopyKey} className="w-full">
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
                )}
            </CardContent>
        </Card>
    );
}
