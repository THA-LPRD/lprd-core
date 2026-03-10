import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PluginHealthBadge, PluginStatusBadge } from '@/components/plugin/status-badge';
import type { Doc } from '@convex/dataModel';

export function PluginDetailsCard({ plugin }: { plugin: Doc<'plugins'> }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="mt-1">
                            <PluginStatusBadge status={plugin.status} />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Health</dt>
                        <dd className="mt-1">
                            <PluginHealthBadge status={plugin.healthStatus} />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Version</dt>
                        <dd className="mt-1 font-mono">{plugin.version}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Base URL</dt>
                        <dd className="mt-1 font-mono">{plugin.baseUrl || '-'}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Scopes</dt>
                        <dd className="mt-1 flex gap-1">
                            {plugin.scopes?.map((s) => (
                                <Badge key={s} variant="secondary">
                                    {s}
                                </Badge>
                            )) ?? <span className="text-muted-foreground">All</span>}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Topics</dt>
                        <dd className="mt-1 flex gap-1 flex-wrap">
                            {plugin.topics.length > 0
                                ? plugin.topics.map((t) => (
                                      <Badge key={t.id} variant="outline">
                                          {t.label}
                                      </Badge>
                                  ))
                                : '-'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">Created</dt>
                        <dd className="mt-1">{new Date(plugin.createdAt).toLocaleDateString()}</dd>
                    </div>
                </dl>
            </CardContent>
        </Card>
    );
}
