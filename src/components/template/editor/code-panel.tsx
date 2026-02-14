'use client';

import { Label } from '@/components/ui/label';

export function CodePanel({
    templateHtml,
    onTemplateHtmlChange,
    sampleDataJson,
    onSampleDataJsonChange,
    disabled,
}: {
    templateHtml: string;
    onTemplateHtmlChange: (value: string) => void;
    sampleDataJson: string;
    onSampleDataJsonChange: (value: string) => void;
    disabled: boolean;
}) {
    return (
        <div className="flex flex-col gap-4 p-4 h-full">
            <div className="flex flex-col gap-2 flex-1 min-h-0">
                <Label htmlFor="template-html">HTML Template</Label>
                <textarea
                    id="template-html"
                    value={templateHtml}
                    onChange={(e) => onTemplateHtmlChange(e.target.value)}
                    disabled={disabled}
                    className="flex-1 min-h-0 w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="<div>{{ content }}</div>"
                    spellCheck={false}
                />
            </div>

            <div className="flex flex-col gap-2 h-48 shrink-0">
                <Label htmlFor="sample-data">Sample Data (JSON)</Label>
                <textarea
                    id="sample-data"
                    value={sampleDataJson}
                    onChange={(e) => onSampleDataJsonChange(e.target.value)}
                    disabled={disabled}
                    className="flex-1 min-h-0 w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder='{"content": "Hello World"}'
                    spellCheck={false}
                />
            </div>
        </div>
    );
}
