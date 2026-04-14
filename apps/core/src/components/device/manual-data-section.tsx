'use client';

import * as React from 'react';
import type { Id } from '@convex/dataModel';
import { DataFieldsEditor } from '@/components/ui/data-fields-editor';
import { Button } from '@workspace/ui/components/button';
import { ButtonGroup } from '@workspace/ui/components/button-group';
import { Badge } from '@workspace/ui/components/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@workspace/ui/components/collapsible';
import { ChevronRight } from 'lucide-react';

const EMPTY_OBJ = {};

export function ManualDataSection({
    data,
    onChange,
    siteId,
}: {
    data: unknown;
    onChange: (data: unknown) => void;
    siteId: Id<'sites'>;
}) {
    // Normalize: null/undefined → empty object for the editor
    const normalizedData = data != null && typeof data === 'object' ? data : EMPTY_OBJ;
    const hasData =
        typeof normalizedData === 'object' && Object.keys(normalizedData as Record<string, unknown>).length > 0;
    const [open, setOpen] = React.useState(hasData);
    const initializedRef = React.useRef(false);
    const [mode, setMode] = React.useState<'form' | 'json'>('form');
    const [jsonText, setJsonText] = React.useState(() => JSON.stringify(normalizedData, null, 2));
    const [jsonError, setJsonError] = React.useState<string | null>(null);
    const lastEmittedRef = React.useRef(JSON.stringify(normalizedData));

    // Auto-open when existing data loads for the first time
    React.useEffect(() => {
        if (hasData && !initializedRef.current) {
            setOpen(true);
            initializedRef.current = true;
        }
    }, [hasData]);

    // Sync jsonText when data changes externally (e.g. from form edits)
    React.useEffect(() => {
        const serialized = JSON.stringify(normalizedData, null, 2);
        if (serialized !== lastEmittedRef.current) {
            setJsonText(serialized);
            lastEmittedRef.current = serialized;
        }
    }, [normalizedData]);

    const handleJsonChange = (text: string) => {
        setJsonText(text);
        try {
            const parsed = JSON.parse(text) as unknown;
            setJsonError(null);
            lastEmittedRef.current = JSON.stringify(parsed, null, 2);
            onChange(parsed);
        } catch {
            setJsonError('Invalid JSON');
        }
    };

    const handleFormChange = (newData: unknown) => {
        const serialized = JSON.stringify(newData, null, 2);
        lastEmittedRef.current = serialized;
        setJsonText(serialized);
        setJsonError(null);
        onChange(newData);
    };

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer">
                <ChevronRight className="size-3.5 transition-transform group-data-panel-open:rotate-90" />
                Manual data
                {hasData && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                        {Object.keys(normalizedData as Record<string, unknown>).length}
                    </Badge>
                )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
                <div className="flex items-center justify-end">
                    <ButtonGroup>
                        <Button
                            variant={mode === 'form' ? 'default' : 'outline'}
                            size="xs"
                            onClick={() => setMode('form')}
                        >
                            Form
                        </Button>
                        <Button
                            variant={mode === 'json' ? 'default' : 'outline'}
                            size="xs"
                            onClick={() => setMode('json')}
                        >
                            JSON
                        </Button>
                    </ButtonGroup>
                </div>
                {mode === 'form' ? (
                    <DataFieldsEditor
                        data={normalizedData}
                        onChange={handleFormChange}
                        disabled={false}
                        siteId={siteId}
                    />
                ) : (
                    <div className="space-y-1">
                        <textarea
                            value={jsonText}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            className="w-full min-h-30 rounded-md border bg-transparent px-3 py-2 font-mono text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder='{"title": "Hello", "photo": "img(https://...)"}'
                            spellCheck={false}
                        />
                        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
