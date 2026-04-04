'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { toast } from 'sonner';
import { containsImgFuncs } from '@/lib/template-data';
import { EditorToolbar } from './editor-toolbar';
import { VariantBar } from './variant-bar';
import { PreviewPanel } from './preview-panel';
import { CodePanel } from './code-panel';
import { AddVariantDialog } from './add-variant-dialog';
import type { Id } from '@convex/dataModel';

import type { TemplateVariant } from '@/lib/template';

type TemplateDoc = {
    _id: Id<'templates'>;
    scope: 'global' | 'site';
    siteId?: Id<'sites'>;
    name: string;
    description?: string;
    templateHtml: string;
    sampleData?: unknown;
    variants: TemplateVariant[];
    preferredVariantIndex: number;
};

export function TemplateEditor({ template, siteSlug }: { template: TemplateDoc; siteSlug: string }) {
    const isGlobal = template.scope === 'global';

    const [name, setName] = React.useState(template.name);
    const [templateHtml, setTemplateHtml] = React.useState(template.templateHtml);
    const [sampleDataJson, setSampleDataJson] = React.useState(
        template.sampleData ? JSON.stringify(template.sampleData, null, 2) : '{}',
    );
    const [variants, setVariants] = React.useState<TemplateVariant[]>(template.variants);
    const [preferredVariantIndex, setPreferredVariantIndex] = React.useState(template.preferredVariantIndex);
    const [activeVariantIndex, setActiveVariantIndex] = React.useState(0);
    const [isDirty, setIsDirty] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [showAddVariant, setShowAddVariant] = React.useState(false);

    const updateTemplate = useMutation(api.templates.crud.update);
    // Parse sample data safely
    const parsedSampleData = React.useMemo(() => {
        try {
            return JSON.parse(sampleDataJson) as Record<string, unknown>;
        } catch {
            return {};
        }
    }, [sampleDataJson]);

    // Track dirty state
    React.useEffect(() => {
        const changed =
            name !== template.name ||
            templateHtml !== template.templateHtml ||
            JSON.stringify(variants) !== JSON.stringify(template.variants) ||
            preferredVariantIndex !== template.preferredVariantIndex ||
            sampleDataJson !== (template.sampleData ? JSON.stringify(template.sampleData, null, 2) : '{}');
        setIsDirty(changed);
    }, [name, templateHtml, sampleDataJson, variants, preferredVariantIndex, template]);

    const activeVariant = variants[activeVariantIndex] ?? variants[0];

    const handleSave = async () => {
        if (isGlobal || !isDirty) return;
        setIsSaving(true);

        try {
            // Parse sampleData
            let sampleData: unknown;
            try {
                sampleData = JSON.parse(sampleDataJson);
            } catch {
                sampleData = undefined;
            }

            await updateTemplate({
                id: template._id,
                name,
                templateHtml,
                sampleData,
                variants,
                preferredVariantIndex,
            });

            const nextJob = {
                type: 'template-thumbnail' as const,
                payload: {
                    templateId: template._id,
                    siteId: template.scope === 'site' ? template.siteId : undefined,
                    siteSlug,
                },
            };

            const response = await fetch('/api/v2/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    containsImgFuncs(sampleData)
                        ? {
                              type: 'normalize-images',
                              resourceType: 'template',
                              resourceId: template._id,
                              siteId: template.scope === 'site' ? template.siteId : undefined,
                              source: 'templateSave',
                              payload: {
                                  type: 'normalize-images',
                                  payload: {
                                      resourceType: 'template',
                                      resourceId: template._id,
                                      source: 'templateSave',
                                      nextJobs: [nextJob],
                                  },
                              },
                          }
                        : {
                              type: 'template-thumbnail',
                              resourceType: 'template',
                              resourceId: template._id,
                              siteId: template.scope === 'site' ? template.siteId : undefined,
                              source: 'templateSave',
                              payload: nextJob,
                          },
                ),
            });

            if (response.ok) {
                toast.success('Template saved');
            } else {
                toast.warning('Template saved, but job enqueue failed');
            }
        } catch {
            toast.error('Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddVariant = (variant: TemplateVariant) => {
        setVariants([...variants, variant]);
        setActiveVariantIndex(variants.length);
    };

    const handleRemoveVariant = (index: number) => {
        if (variants.length <= 1) return;
        const newVariants = variants.filter((_, i) => i !== index);
        setVariants(newVariants);

        // Adjust indices
        if (activeVariantIndex >= newVariants.length) {
            setActiveVariantIndex(newVariants.length - 1);
        }
        if (preferredVariantIndex === index) {
            setPreferredVariantIndex(0);
        } else if (preferredVariantIndex > index) {
            setPreferredVariantIndex(preferredVariantIndex - 1);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-52px)] overflow-hidden">
            <EditorToolbar
                siteSlug={siteSlug}
                name={name}
                onNameChange={setName}
                scope={template.scope}
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={handleSave}
            />

            <VariantBar
                variants={variants}
                activeVariantIndex={activeVariantIndex}
                preferredVariantIndex={preferredVariantIndex}
                onSelectVariant={setActiveVariantIndex}
                onSetPreferred={setPreferredVariantIndex}
                onRemoveVariant={handleRemoveVariant}
                onAddVariant={() => setShowAddVariant(true)}
                disabled={isGlobal}
            />

            <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
                {/* Left: Preview */}
                <div className="flex-1 border-r overflow-auto bg-muted/10">
                    <PreviewPanel
                        templateHtml={templateHtml}
                        sampleData={parsedSampleData}
                        activeVariant={activeVariant}
                    />
                </div>

                {/* Right: Code */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <CodePanel
                        templateHtml={templateHtml}
                        onTemplateHtmlChange={setTemplateHtml}
                        sampleDataJson={sampleDataJson}
                        onSampleDataJsonChange={setSampleDataJson}
                        disabled={isGlobal}
                    />
                </div>
            </div>

            <AddVariantDialog
                open={showAddVariant}
                onOpenChangeAction={setShowAddVariant}
                onAddAction={handleAddVariant}
            />
        </div>
    );
}
