'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReissueTokenDialog } from '@/components/plugin/reissue-dialog';
import { PluginDetailsCard } from '@/components/plugin/plugin-details-card';
import { PluginRegKeyCard } from '@/components/plugin/plugin-reg-key-card';
import { PluginHealthCard } from '@/components/plugin/plugin-health-card';
import { PluginOrgAccessCard } from '@/components/plugin/plugin-org-access-card';
import type { Doc } from '@convex/dataModel';

export function PluginDetail({ plugin }: { plugin: Doc<'plugins'> }) {
    const router = useRouter();
    const updateStatus = useMutation(api.plugins.admin.updateStatus);
    const [showReissue, setShowReissue] = React.useState(false);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" render={<Link href="/admin/plugins" />} nativeButton={false}>
                    <ArrowLeft className="size-4 mr-1" />
                    Back
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{plugin.name}</h1>
                    {plugin.description && <p className="text-muted-foreground">{plugin.description}</p>}
                </div>
                <div className="flex gap-2">
                    {plugin.status === 'active' && (
                        <>
                            <Button variant="outline" onClick={() => setShowReissue(true)}>
                                <KeyRound className="size-4 mr-2" />
                                Reissue Token
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => updateStatus({ id: plugin._id, status: 'suspended' })}
                            >
                                <Pause className="size-4 mr-2" />
                                Suspend
                            </Button>
                        </>
                    )}
                    {plugin.status === 'suspended' && (
                        <Button
                            variant="outline"
                            onClick={() => updateStatus({ id: plugin._id, status: 'active' })}
                        >
                            <Play className="size-4 mr-2" />
                            Activate
                        </Button>
                    )}
                    {plugin.status !== 'removed' && (
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                await updateStatus({ id: plugin._id, status: 'removed' });
                                router.push('/admin/plugins');
                            }}
                        >
                            <Trash2 className="size-4 mr-2" />
                            Remove
                        </Button>
                    )}
                </div>
            </div>

            <PluginDetailsCard plugin={plugin} />

            {plugin.status === 'pending' && plugin.registrationKey && plugin.registrationKeyExpiresAt && (
                <PluginRegKeyCard
                    registrationKey={plugin.registrationKey}
                    registrationKeyExpiresAt={plugin.registrationKeyExpiresAt}
                />
            )}

            <PluginHealthCard pluginId={plugin._id} />
            <PluginOrgAccessCard pluginId={plugin._id} />

            {showReissue && (
                <ReissueTokenDialog
                    open={showReissue}
                    onOpenChange={setShowReissue}
                    pluginId={plugin._id}
                    pluginName={plugin.name}
                />
            )}
        </div>
    );
}
