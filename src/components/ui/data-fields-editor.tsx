'use client';

import * as React from 'react';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { jsonToRows, rowsToJson, type SimpleRow } from '@/lib/template-data';
import { AssetPicker } from '@/components/asset/asset-picker';

const IMG_FUNC_RE = /^img\((.+)\)$/;

function AssetPreview({ storageId, siteId }: { storageId: string; siteId: Id<'sites'> }) {
    const assets = useQuery(api.siteAssets.list, { siteId });
    const asset = assets?.find((a) => a.storageId === storageId);
    const url = asset?.url ?? null;

    if (!url) return null;
    return (
        <div className="relative h-8 items-center rounded border">
            <Image
                style={{ objectFit: 'contain' }}
                fill
                src={url}
                alt={asset?.filename ?? 'asset'}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
        </div>
    );
}

export function DataFieldsEditor({
    data,
    onChange,
    disabled,
    siteId,
}: {
    data: unknown;
    onChange: (data: unknown) => void;
    disabled: boolean;
    siteId?: Id<'sites'>;
}) {
    const [rows, setRows] = React.useState<SimpleRow[]>(() => jsonToRows(data));
    const lastEmitted = React.useRef<string>(JSON.stringify(data));
    const [pickerOpenIndex, setPickerOpenIndex] = React.useState<number | null>(null);

    React.useEffect(() => {
        const serialized = JSON.stringify(data);
        if (serialized !== lastEmitted.current) {
            setRows(jsonToRows(data));
            lastEmitted.current = serialized;
        }
    }, [data]);

    const emit = (next: SimpleRow[]) => {
        setRows(next);
        const result = rowsToJson(next);
        lastEmitted.current = JSON.stringify(result);
        onChange(result);
    };

    const setKey = (index: number, newKey: string) => {
        const next = [...rows];
        next[index] = { ...next[index], key: newKey };
        emit(next);
    };

    const setValue = (index: number, value: string) => {
        const next = [...rows];
        next[index] = { ...next[index], value };
        emit(next);
    };

    const addRow = () => {
        const next = [...rows, { key: '', value: '' }];
        setRows(next);
        const result = rowsToJson(next);
        lastEmitted.current = JSON.stringify(result);
        onChange(result);
    };

    const removeRow = (index: number) => {
        emit(rows.filter((_, i) => i !== index));
    };

    const handleAssetSelect = (index: number, storageId: Id<'_storage'>) => {
        const next = [...rows];
        next[index] = { ...next[index], value: `img(${storageId})` };
        emit(next);
        setPickerOpenIndex(null);
    };

    return (
        <div className="flex flex-col gap-2">
            {rows.map((row, i) => {
                const imgMatch = IMG_FUNC_RE.exec(row.value);
                const storageId = imgMatch ? imgMatch[1] : null;
                return (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-start gap-1.5">
                            <Input
                                value={row.key}
                                onChange={(e) => setKey(i, e.target.value)}
                                placeholder="key"
                                disabled={disabled}
                                className="w-36 shrink-0 font-mono text-xs"
                            />
                            <Input
                                value={row.value}
                                onChange={(e) => setValue(i, e.target.value)}
                                placeholder="value"
                                disabled={disabled}
                                className="flex-1 min-w-0 font-mono text-xs"
                            />
                            {siteId && (
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => setPickerOpenIndex(i)}
                                    disabled={disabled}
                                    title="Pick image from site library"
                                >
                                    <ImageIcon />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon-xs" onClick={() => removeRow(i)} disabled={disabled}>
                                <TrashIcon />
                            </Button>
                        </div>
                        {storageId && siteId && <AssetPreview storageId={storageId} siteId={siteId} />}
                    </div>
                );
            })}
            <Button variant="outline" size="xs" onClick={addRow} disabled={disabled} className="self-start">
                <PlusIcon data-icon="inline-start" />
                Add field
            </Button>

            {pickerOpenIndex !== null && siteId && (
                <AssetPicker
                    open
                    onOpenChange={(open) => {
                        if (!open) setPickerOpenIndex(null);
                    }}
                    siteId={siteId}
                    onSelect={(storageId) => handleAssetSelect(pickerOpenIndex, storageId)}
                />
            )}
        </div>
    );
}
