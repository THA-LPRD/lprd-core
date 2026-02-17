'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusIcon, TrashIcon } from 'lucide-react';
import type { DataField, TemplateData } from '@/lib/template-data';

type FieldEntry = { key: string; field: DataField };

function toEntries(data: TemplateData): FieldEntry[] {
    return Object.entries(data).map(([key, field]) => ({ key, field }));
}

function fromEntries(entries: FieldEntry[]): TemplateData {
    const result: TemplateData = {};
    for (const { key, field } of entries) {
        if (key.trim()) result[key.trim()] = field;
    }
    return result;
}

const defaultField = (type: 'text' | 'img'): DataField =>
    type === 'text' ? { type: 'text', value: '' } : { type: 'img', url: '' };

export function DataFieldsEditor({
    data,
    onChange,
    disabled,
}: {
    data: TemplateData;
    onChange: (data: TemplateData) => void;
    disabled: boolean;
}) {
    // Local entries state allows empty keys to exist while the user types.
    // We only sync from the parent prop when the serialized data actually differs
    // (i.e. an external change, not our own emit).
    const [entries, setEntries] = React.useState<FieldEntry[]>(() => toEntries(data));
    const lastEmitted = React.useRef<string>(JSON.stringify(data));

    React.useEffect(() => {
        const serialized = JSON.stringify(data);
        if (serialized !== lastEmitted.current) {
            setEntries(toEntries(data));
            lastEmitted.current = serialized;
        }
    }, [data]);

    const emit = (next: FieldEntry[]) => {
        setEntries(next);
        const result = fromEntries(next);
        lastEmitted.current = JSON.stringify(result);
        onChange(result);
    };

    const setKey = (index: number, newKey: string) => {
        const next = [...entries];
        next[index] = { ...next[index], key: newKey };
        emit(next);
    };

    const setFieldType = (index: number, type: 'text' | 'img') => {
        const next = [...entries];
        next[index] = { ...next[index], field: defaultField(type) };
        emit(next);
    };

    const setFieldValue = (index: number, value: string) => {
        const next = [...entries];
        const field = next[index].field;
        if (field.type === 'text') {
            next[index] = { ...next[index], field: { ...field, value } };
        } else {
            next[index] = { ...next[index], field: { ...field, url: value } };
        }
        emit(next);
    };

    const addField = () => {
        // Add with empty key — the row stays visible because entries is local state.
        // It won't appear in the emitted TemplateData until the user types a key.
        const next = [...entries, { key: '', field: defaultField('text') }];
        setEntries(next);
        const result = fromEntries(next);
        lastEmitted.current = JSON.stringify(result);
        onChange(result);
    };

    const removeField = (index: number) => {
        emit(entries.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col gap-2">
            {entries.map((entry, i) => (
                <div key={i} className="flex items-start gap-1.5">
                    <Input
                        value={entry.key}
                        onChange={(e) => setKey(i, e.target.value)}
                        placeholder="key"
                        disabled={disabled}
                        className="w-28 shrink-0"
                    />
                    <Select
                        value={entry.field.type}
                        onValueChange={(v) => setFieldType(i, v as 'text' | 'img')}
                        disabled={disabled}
                    >
                        <SelectTrigger size="sm" className="w-18 shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="text">text</SelectItem>
                            <SelectItem value="img">img</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <Input
                            value={entry.field.type === 'text' ? entry.field.value : entry.field.url}
                            onChange={(e) => setFieldValue(i, e.target.value)}
                            placeholder={entry.field.type === 'text' ? 'value' : 'https://...'}
                            disabled={disabled}
                        />
                        {entry.field.type === 'img' && entry.field.url && (
                            <img
                                src={entry.field.url}
                                alt=""
                                className="h-8 w-auto rounded border object-contain"
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                    </div>
                    <Button variant="ghost" size="icon-xs" onClick={() => removeField(i)} disabled={disabled}>
                        <TrashIcon />
                    </Button>
                </div>
            ))}
            <Button variant="outline" size="xs" onClick={addField} disabled={disabled} className="self-start">
                <PlusIcon data-icon="inline-start" />
                Add field
            </Button>
        </div>
    );
}