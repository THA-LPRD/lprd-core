"use client"

import Link from "next/link"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {DeviceStatusDot} from "./device-status-dot"
import {Monitor} from "lucide-react"
import type {Id} from "../../../convex/_generated/dataModel"

type Device = {
    _id: Id<"devices">
    id: string
    organizationId: Id<"organizations">
    name: string
    description?: string
    tags: string[]
    status: "pending" | "active"
    lastSeen?: number
    createdAt: number
    updatedAt: number
}

function formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return "Never"

    const now = Date.now()
    const diff = now - timestamp

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return "Just now"
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hr ago`
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`

    return new Date(timestamp).toLocaleDateString()
}

export function DeviceCard({
    device,
    orgSlug,
}: {
    device: Device
    orgSlug: string
}) {
    return (
        <Link href={`/org/${orgSlug}/devices/${device.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden">
                {/* Device preview area */}
                <div className="aspect-video bg-muted flex items-center justify-center border-b">
                    <Monitor className="size-12 text-muted-foreground/50" />
                </div>

                <CardContent className="p-4">
                    {/* Name with status */}
                    <div className="flex items-center gap-2 mb-1">
                        <DeviceStatusDot status={device.status} />
                        <h3 className="font-medium truncate">{device.name}</h3>
                    </div>

                    {/* Tags */}
                    {device.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {device.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {device.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                    +{device.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Last seen */}
                    <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(device.lastSeen)}
                    </p>
                </CardContent>
            </Card>
        </Link>
    )
}