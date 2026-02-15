'use client';

import type { TemplateOption } from './template-picker';
import { TemplatePickerInline } from './template-picker';
import type { Id } from '@convex/dataModel';

type LayerRef = {
    templateId: Id<'templates'>;
    variantIndex: number;
};

export function LayerControls({
    background,
    foreground,
    templates,
    onPickBackground,
    onPickForeground,
    onClearBackground,
    onClearForeground,
}: {
    background?: LayerRef;
    foreground?: LayerRef;
    templates: TemplateOption[];
    onPickBackground: () => void;
    onPickForeground: () => void;
    onClearBackground: () => void;
    onClearForeground: () => void;
}) {
    const bgName = background ? templates.find((t) => t._id === background.templateId)?.name : undefined;
    const fgName = foreground ? templates.find((t) => t._id === foreground.templateId)?.name : undefined;

    return (
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-background text-sm">
            <TemplatePickerInline
                label="BG"
                templateName={bgName}
                onPick={onPickBackground}
                onClear={onClearBackground}
            />
            <div className="w-px h-4 bg-border" />
            <TemplatePickerInline
                label="FG"
                templateName={fgName}
                onPick={onPickForeground}
                onClear={onClearForeground}
            />
        </div>
    );
}
