import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import type * as React from 'react';

type SleepIntervalFieldProps = {
    id: string;
    label: string;
    hint: string;
    value: number;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function SleepIntervalField({ id, label, hint, value, onChange }: SleepIntervalFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-2">
                <Input id={id} type="number" min={1 / 60} step={0.25} value={value} onChange={onChange} />
                <span className="text-sm text-muted-foreground shrink-0">hr</span>
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}
