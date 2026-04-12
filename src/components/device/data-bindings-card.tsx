'use client';

import * as React from 'react';
import { type DataSource, DataSourcePicker } from '@/components/device/data-source-picker';
import { ManualDataSection } from '@/components/device/manual-data-section';
import type { Binding } from '@/components/device/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { Id } from '@convex/dataModel';

type Widget = {
    id: string;
    templateId?: Id<'templates'>;
    w: number;
    h: number;
};

export function DataBindingsCard({
    widgets,
    bindings,
    onBindingsChange,
    manualData,
    onManualDataChange,
    siteId,
    getTemplateName,
    getPluginName,
}: {
    widgets: Widget[];
    bindings: Binding[];
    onBindingsChange: (bindings: Binding[]) => void;
    manualData: Record<string, unknown>;
    onManualDataChange: (widgetId: string, data: unknown) => void;
    siteId: Id<'sites'>;
    getTemplateName: (templateId?: string) => string;
    getPluginName: (pluginId: Id<'applications'>) => string;
}) {
    const addBinding = (widgetId: string, source: DataSource) => {
        onBindingsChange([...bindings, { widgetId, ...source }]);
    };

    const removeBinding = (index: number) => {
        onBindingsChange(bindings.filter((_, i) => i !== index));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Data Bindings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {widgets.length === 0 && <p className="text-sm text-muted-foreground">No widgets in this frame.</p>}
                {widgets.map((widget) => {
                    const widgetBindings = bindings.filter((b) => b.widgetId === widget.id && b.topic !== 'manual');
                    return (
                        <div key={widget.id} className="space-y-2 space-x-2">
                            <p className="text-sm font-medium">
                                {getTemplateName(widget.templateId as string | undefined)}
                                <span className="text-muted-foreground ml-1">
                                    ({widget.w}x{widget.h})
                                </span>
                            </p>

                            {widgetBindings.map((binding) => {
                                const idx = bindings.indexOf(binding);
                                return (
                                    <Badge variant="secondary" key={idx} className="gap-2 text-sm p-3">
                                        <span className="truncate flex-1">
                                            {getPluginName(binding.applicationId)} &middot; {binding.topic}/
                                            {binding.entry}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            onClick={() => removeBinding(idx)}
                                            className="text-muted-foreground hover:text-destructive px-0"
                                        >
                                            <X className="size-3.5" />
                                        </Button>
                                    </Badge>
                                );
                            })}

                            <AddBindingRow siteId={siteId} onAdd={(source) => addBinding(widget.id, source)} />

                            <ManualDataSection
                                data={manualData[widget.id] ?? null}
                                onChange={(data) => onManualDataChange(widget.id, data)}
                                siteId={siteId}
                            />
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

function AddBindingRow({ siteId, onAdd }: { siteId: Id<'sites'>; onAdd: (source: DataSource) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                onClick={() => setIsOpen(true)}
                className="text-muted-foreground hover:text-foreground px-0"
            >
                <Plus className="size-3.5" />
                Add data source
            </Button>
        );
    }

    return (
        <div className="flex items-start gap-2">
            <DataSourcePicker
                siteId={siteId}
                onChange={(source) => {
                    onAdd(source);
                    setIsOpen(false);
                }}
            />
            <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground dark:hover:bg-transparent hover:bg-transparent"
            >
                <X className="size-3.5" />
            </Button>
        </div>
    );
}
