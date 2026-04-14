'use client';

import type { Id } from '@convex/dataModel';
import type { TemplateVariant } from '@shared/template';
import * as React from 'react';
import { toast } from 'sonner';
import { updateSiteTemplate } from '@/lib/template-actions';
import { AddVariantDialog } from './add-variant-dialog';
import { CodePanel } from './code-panel';
import { EditorToolbar } from './editor-toolbar';
import { PreviewPanel } from './preview-panel';
import { VariantBar } from './variant-bar';

const DEFAULT_VARIANT: TemplateVariant = { type: 'content', w: 3, h: 2 };

type TemplateDoc = {
    _id: Id<'templates'>;
    scope: 'organization' | 'site';
    siteId?: Id<'sites'>;
    name: string;
    description?: string;
    templateHtml: string;
    sampleData?: unknown;
    variants: TemplateVariant[];
    preferredVariantIndex: number;
};

export function TemplateEditor({ template, siteSlug }: { template: TemplateDoc; siteSlug: string }) {
    const isOrganizationScoped = template.scope === 'organization';

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

    const activeVariant = variants[activeVariantIndex] ?? variants[0] ?? DEFAULT_VARIANT;

    const handleSave = async () => {
        if (isOrganizationScoped || !isDirty) return;
        setIsSaving(true);

        try {
            // Parse sampleData
            let sampleData: unknown;
            try {
                sampleData = JSON.parse(sampleDataJson);
            } catch {
                sampleData = undefined;
            }

            const siteId = template.siteId;
            if (!siteId) throw new Error('Cannot save a site template without a site id');

            const result = await updateSiteTemplate({
                siteId,
                templateId: template._id,
                siteSlug,
                name,
                templateHtml,
                sampleData,
                variants,
                preferredVariantIndex,
            });

            if (result.enqueueWarning) {
                toast.warning(`Template saved, but ${result.enqueueWarning.toLowerCase()}`);
            } else {
                toast.success('Template saved');
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
                onNameChangeAction={setName}
                scope={template.scope}
                isDirty={isDirty}
                isSaving={isSaving}
                onSaveAction={handleSave}
            />

            <VariantBar
                variants={variants}
                activeVariantIndex={activeVariantIndex}
                preferredVariantIndex={preferredVariantIndex}
                onSelectVariant={setActiveVariantIndex}
                onSetPreferred={setPreferredVariantIndex}
                onRemoveVariant={handleRemoveVariant}
                onAddVariant={() => setShowAddVariant(true)}
                disabled={isOrganizationScoped}
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
                        disabled={isOrganizationScoped}
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
