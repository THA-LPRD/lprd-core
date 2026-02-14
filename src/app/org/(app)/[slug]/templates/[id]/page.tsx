"use client"

import {useParams} from "next/navigation"
import {useQuery} from "convex/react"
import {api} from "@convex/api"
import {TemplateEditor} from "@/components/template/editor/template-editor"
import {Skeleton} from "@/components/ui/skeleton"
import {TemplateNotFound} from "@/components/ui/not-found"
import type {Id} from "@convex/dataModel"

export default function TemplateEditorPage() {
    const params = useParams<{slug: string; id: string}>()

    const template = useQuery(api.templates.getById, {
        id: params.id as Id<"templates">,
    })

    if (template === undefined) {
        return (
            <div className="p-6">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-4" />
                <div className="flex gap-4">
                    <Skeleton className="flex-1 h-96" />
                    <Skeleton className="flex-1 h-96" />
                </div>
            </div>
        )
    }

    if (!template) {
        return <TemplateNotFound />
    }

    return <TemplateEditor template={template} orgSlug={params.slug} />
}
