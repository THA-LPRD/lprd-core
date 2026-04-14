'use client';

import { Label } from '@workspace/ui/components/label';
import { Button } from '@workspace/ui/components/button';
import { ButtonGroup } from '@workspace/ui/components/button-group';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { syntaxTree } from '@codemirror/language';
import { type Diagnostic, linter, lintGutter } from '@codemirror/lint';
import nunjucks from 'nunjucks';
import { useTheme } from 'next-themes';
import { type CSSProperties, useMemo, useState } from 'react';
import { DataFieldsEditor } from '@/components/ui/data-fields-editor';

const nunjucksEnv = new nunjucks.Environment(null, { autoescape: true });

function syntaxErrorLinter(label: string) {
    return linter((view) => {
        const diagnostics: Diagnostic[] = [];
        syntaxTree(view.state).iterate({
            enter: (node) => {
                if (node.type.isError) {
                    diagnostics.push({
                        from: node.from,
                        to: Math.max(node.from + 1, node.to),
                        severity: 'error',
                        message: `${label} syntax error`,
                    });
                }
            },
        });
        return diagnostics;
    });
}

const jsonExtensions = [json(), syntaxErrorLinter('JSON'), lintGutter()];

const cmStyle: CSSProperties = {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
};

type DataMode = 'form' | 'json';

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
    const { resolvedTheme } = useTheme();
    const cmTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

    const editableConfig = useMemo(() => ({ editable: !disabled, readOnly: disabled }), [disabled]);

    const sampleData = useMemo(() => {
        try {
            return JSON.parse(sampleDataJson) as Record<string, unknown>;
        } catch {
            return {};
        }
    }, [sampleDataJson]);

    const [dataMode, setDataMode] = useState<DataMode>('form');

    const handleFormChange = (data: unknown) => {
        onSampleDataJsonChange(JSON.stringify(data, null, 2));
    };

    const htmlExtensions = useMemo(
        () => [
            html(),
            syntaxErrorLinter('HTML'),
            linter((view) => {
                const doc = view.state.doc.toString();
                if (!doc.trim()) return [];
                try {
                    nunjucksEnv.renderString(doc, sampleData);
                    return [];
                } catch (e) {
                    const err = e as { lineno?: number; colno?: number; message?: string };
                    let from = 0;
                    if (err.lineno) {
                        const lineNum = Math.min(err.lineno, view.state.doc.lines);
                        const line = view.state.doc.line(lineNum);
                        from = line.from + Math.max(0, (err.colno ?? 1) - 1);
                        from = Math.min(from, line.to);
                    }
                    const to = Math.min(from + 1, view.state.doc.length);
                    const message = (err.message ?? 'Template error').replace(/^\(unknown path\)\s*/, '');
                    return [{ from, to, severity: 'error' as const, message }];
                }
            }),
            lintGutter(),
        ],
        [sampleData],
    );

    return (
        <div className="flex flex-col gap-4 p-4 h-full min-w-0">
            <div className="flex flex-col gap-2 flex-1 min-h-0 min-w-0">
                <Label>HTML Template</Label>
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-md border">
                    <CodeMirror
                        value={templateHtml}
                        onChange={onTemplateHtmlChange}
                        extensions={htmlExtensions}
                        editable={editableConfig.editable}
                        readOnly={editableConfig.readOnly}
                        placeholder="<div>{{ content }}</div>"
                        height="100%"
                        width="100%"
                        style={cmStyle}
                        theme={cmTheme}
                        basicSetup={{ foldGutter: false }}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 h-48 shrink-0 min-w-0">
                <div className="flex items-center justify-between">
                    <Label>Sample Data</Label>
                    <ButtonGroup>
                        <Button
                            variant={dataMode === 'form' ? 'default' : 'outline'}
                            size="xs"
                            onClick={() => setDataMode('form')}
                        >
                            Form
                        </Button>
                        <Button
                            variant={dataMode === 'json' ? 'default' : 'outline'}
                            size="xs"
                            onClick={() => setDataMode('json')}
                        >
                            JSON
                        </Button>
                    </ButtonGroup>
                </div>
                <div className="h-full min-h-0 min-w-0 overflow-auto rounded-md border">
                    {dataMode === 'json' ? (
                        <CodeMirror
                            value={sampleDataJson}
                            onChange={onSampleDataJsonChange}
                            extensions={jsonExtensions}
                            editable={editableConfig.editable}
                            readOnly={editableConfig.readOnly}
                            placeholder='{"title": "Hello", "photo": "img(https://...)"}'
                            height="100%"
                            width="100%"
                            style={cmStyle}
                            theme={cmTheme}
                            basicSetup={{ foldGutter: false }}
                        />
                    ) : (
                        <div className="p-2">
                            <DataFieldsEditor data={sampleData} onChange={handleFormChange} disabled={disabled} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
