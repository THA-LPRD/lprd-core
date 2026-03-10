'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { jsonToRows, rowsToJson, type SimpleRow } from '@/lib/template-data';
import Image from 'next/image';

const IMG_FUNC_RE = /^img\((.+)\)$/;

export function DataFieldsEditor({
    data,
    onChange,
    disabled,
}: {
    data: unknown;
    onChange: (data: unknown) => void;
    disabled: boolean;
}) {
    const [rows, setRows] = React.useState<SimpleRow[]>(() => jsonToRows(data));
    const lastEmitted = React.useRef<string>(JSON.stringify(data));

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

    return (
        <div className="flex flex-col gap-2">
            {rows.map((row, i) => {
                const imgMatch = IMG_FUNC_RE.exec(row.value);
                const imgUrl = imgMatch ? imgMatch[1] : null;
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
                                placeholder="value or img(https://...)"
                                disabled={disabled}
                                className="flex-1 min-w-0"
                            />
                            <Button variant="ghost" size="icon-xs" onClick={() => removeRow(i)} disabled={disabled}>
                                <TrashIcon />
                            </Button>
                        </div>
                        {imgUrl && (
                            <div className="relative h-8 items-center rounded border">
                                <Image
                                    objectFit="contain"
                                    fill
                                    src={imgUrl}
                                    alt="user provided image"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
            <Button variant="outline" size="xs" onClick={addRow} disabled={disabled} className="self-start">
                <PlusIcon data-icon="inline-start" />
                Add field
            </Button>
        </div>
    );
}
