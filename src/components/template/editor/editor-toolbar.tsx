"use client"

import Link from "next/link"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip"
import {ArrowLeft, Save} from "lucide-react"

export function EditorToolbar({
    orgSlug,
    name,
    onNameChange,
    scope,
    isDirty,
    isSaving,
    onSave,
}: {
    orgSlug: string
    name: string
    onNameChange: (name: string) => void
    scope: "global" | "org"
    isDirty: boolean
    isSaving: boolean
    onSave: () => void
}) {
    const isGlobal = scope === "global"

    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
            <Link href={`/org/${orgSlug}/templates`}>
                <Button variant="ghost" size="icon" className="size-8">
                    <ArrowLeft className="size-4" />
                </Button>
            </Link>

            <Input
                value={name}
                onChange={e => onNameChange(e.target.value)}
                disabled={isGlobal}
                className="max-w-xs font-medium border-transparent hover:border-input focus:border-input transition-colors"
            />

            <Badge variant={isGlobal ? "outline" : "secondary"}>
                {isGlobal ? "Global" : "Org"}
            </Badge>

            {isDirty && !isGlobal && (
                <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}

            <div className="ml-auto">
                <Tooltip>
                    <TooltipTrigger render={<span />}>
                        <Button
                            render={<div />}
                            nativeButton={false}
                            onClick={onSave}
                            disabled={isGlobal || !isDirty || isSaving}
                            size="sm"
                        >
                            <Save className="size-4 mr-2" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </TooltipTrigger>
                    {isGlobal && (
                        <TooltipContent>Global templates are read-only</TooltipContent>
                    )}
                </Tooltip>
            </div>
        </div>
    )
}
