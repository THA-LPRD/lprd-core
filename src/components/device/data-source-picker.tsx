'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { Id } from '@convex/dataModel';

const NONE = '__none__';

export type DataSource = {
    applicationId: Id<'applications'>;
    topic: string;
    entry: string;
};

export function DataSourcePicker({
    siteId,
    value,
    onChange,
}: {
    siteId: Id<'sites'>;
    value?: DataSource;
    onChange: (source: DataSource) => void;
}) {
    const plugins = useQuery(api.applications.plugin.data.listPluginsWithTopics, { siteId });
    const [selectedPluginId, setSelectedPluginId] = React.useState<string>(value?.applicationId ?? NONE);
    const [selectedTopic, setSelectedTopic] = React.useState<string>(value?.topic ?? NONE);
    const [selectedEntry, setSelectedEntry] = React.useState<string>(value?.entry ?? NONE);

    const selectedPlugin = selectedPluginId !== NONE ? plugins?.find((p) => p._id === selectedPluginId) : undefined;
    const topics = selectedPlugin?.topics ?? [];

    const entries = useQuery(
        api.applications.plugin.data.listEntries,
        selectedPluginId !== NONE && selectedTopic !== NONE
            ? { pluginId: selectedPluginId as Id<'applications'>, siteId, topic: selectedTopic }
            : 'skip',
    );

    return (
        <FieldGroup className="flex-row flex-wrap items-end gap-3">
            <Field orientation="vertical" className="w-40">
                <FieldLabel>Plugin</FieldLabel>
                <Select
                    value={selectedPluginId}
                    onValueChange={(val) => {
                        setSelectedPluginId(val ?? NONE);
                        setSelectedTopic(NONE);
                        setSelectedEntry(NONE);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select plugin">
                            <span className="truncate block">{selectedPlugin?.name ?? 'Select plugin'}</span>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value={NONE} disabled>
                            Select plugin
                        </SelectItem>
                        {plugins?.map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            <Field orientation="vertical" className="w-35">
                <FieldLabel>Topic</FieldLabel>
                <Select
                    value={selectedTopic}
                    onValueChange={(val) => {
                        setSelectedTopic(val ?? NONE);
                        setSelectedEntry(NONE);
                    }}
                    disabled={selectedPluginId === NONE}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select topic">
                            <span className="truncate block">
                                {topics.find((t) => t.key === selectedTopic)?.label ?? 'Select topic'}
                            </span>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value={NONE} disabled>
                            Select topic
                        </SelectItem>
                        {topics.map((t) => (
                            <SelectItem key={t.key} value={t.key}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>

            <Field orientation="vertical" className="w-35">
                <FieldLabel>Entry</FieldLabel>
                <Select
                    value={selectedEntry}
                    onValueChange={(val) => {
                        const entry = val ?? NONE;
                        setSelectedEntry(entry);
                        if (selectedPluginId !== NONE && selectedTopic !== NONE && entry !== NONE) {
                            onChange({
                                applicationId: selectedPluginId as Id<'applications'>,
                                topic: selectedTopic,
                                entry,
                            });
                        }
                    }}
                    disabled={selectedTopic === NONE}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select entry" />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value={NONE} disabled>
                            Select entry
                        </SelectItem>
                        {entries?.map((entry) => (
                            <SelectItem key={entry} value={entry}>
                                {entry}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
        </FieldGroup>
    );
}
