"use client"

import {TemplateCard, type Template} from "./template-card"
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription} from "@/components/ui/empty"
import {LayoutTemplate} from "lucide-react"

export function TemplateGrid({
    templates,
    onEdit,
    onDelete,
    onDuplicate,
}: {
    templates: Template[]
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    onDuplicate: (id: string) => void
}) {
    if (templates.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <LayoutTemplate />
                    </EmptyMedia>
                    <EmptyTitle>No templates yet</EmptyTitle>
                    <EmptyDescription>
                        Create your first template to get started
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map(template => (
                <TemplateCard
                    key={template._id}
                    template={template}
                    onEdit={() => onEdit(template._id)}
                    onDelete={() => onDelete(template._id)}
                    onDuplicate={() => onDuplicate(template._id)}
                />
            ))}
        </div>
    )
}
