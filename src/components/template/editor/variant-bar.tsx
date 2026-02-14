"use client"

import {Button} from "@/components/ui/button"
import {ButtonGroup} from "@/components/ui/button-group"
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip"
import {Plus, Star, X} from "lucide-react"

type TemplateVariant =
    | {type: "content"; w: number; h: number}
    | {type: "background"}
    | {type: "foreground"}

function variantLabel(v: TemplateVariant): string {
    if (v.type === "content") return `${v.w}×${v.h}`
    if (v.type === "background") return "BG"
    return "FG"
}

export function VariantBar({
    variants,
    activeVariantIndex,
    preferredVariantIndex,
    onSelectVariant,
    onSetPreferred,
    onRemoveVariant,
    onAddVariant,
    disabled,
}: {
    variants: TemplateVariant[]
    activeVariantIndex: number
    preferredVariantIndex: number
    onSelectVariant: (index: number) => void
    onSetPreferred: (index: number) => void
    onRemoveVariant: (index: number) => void
    onAddVariant: () => void
    disabled: boolean
}) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 overflow-x-auto">
            <span className="text-xs text-muted-foreground shrink-0">Variants:</span>

            {variants.map((v, i) => {
                const isActive = i === activeVariantIndex
                const isPreferred = i === preferredVariantIndex
                const buttonVariant = isActive ? "default" : "outline"

                return (
                    <ButtonGroup
                        key={i}
                        className="shrink-0 *:data-slot:border-0"
                    >
                        {isActive && !disabled && (
                            isPreferred ? (
                                <Button
                                    render={<div />}
                                    nativeButton={false}
                                    variant={buttonVariant}
                                    size="icon-sm"
                                    className="pointer-events-none text-amber-400"
                                >
                                    <Star className="size-3.5 fill-current" />
                                </Button>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Button
                                                variant={buttonVariant}
                                                size="icon-sm"
                                                className="text-primary-foreground/40 hover:text-amber-300 transition-colors"
                                                onClick={() => onSetPreferred(i)}
                                            />
                                        }
                                    >
                                        <Star className="size-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent>Set as preferred</TooltipContent>
                                </Tooltip>
                            )
                        )}

                        <Button
                            variant={buttonVariant}
                            size="sm"
                            className="gap-1 px-2 text-xs"
                            onClick={() => onSelectVariant(i)}
                        >
                            {!isActive && isPreferred && (
                                <Star className="size-3 fill-current" />
                            )}
                            {variantLabel(v)}
                        </Button>

                        {!disabled && variants.length > 1 && (
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            variant={buttonVariant}
                                            size="icon-sm"
                                            className="hover:bg-destructive/20 hover:text-destructive transition-colors"
                                            onClick={() => onRemoveVariant(i)}
                                        />
                                    }
                                >
                                    <X className="size-3.5" />
                                </TooltipTrigger>
                                <TooltipContent>Remove variant</TooltipContent>
                            </Tooltip>
                        )}
                    </ButtonGroup>
                )
            })}

            {!disabled && (
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 px-2 h-7 text-xs shrink-0"
                    onClick={onAddVariant}
                >
                    <Plus className="size-3" />
                    Add
                </Button>
            )}
        </div>
    )
}
