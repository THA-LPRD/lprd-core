"use client"

import * as React from "react"
import {useParams} from "next/navigation"
import {useMutation, useQuery} from "convex/react"
import {api} from "@convex/api"
import {DeviceGrid} from "@/components/device/device-grid"
import {DeviceForm} from "@/components/device/device-form"
import {Button} from "@/components/ui/button"
import {Skeleton} from "@/components/ui/skeleton"
import {Plus} from "lucide-react"
import {v4 as uuidv4} from "uuid"

export default function DevicesPage() {
    const params = useParams<{ slug: string }>()
    const [showAddForm, setShowAddForm] = React.useState(false)

    // Get org by slug
    const org = useQuery(api.organizations.getBySlug, { slug: params.slug })

    // Get devices for this org
    const devices = useQuery(
        api.devices.listByOrganization,
        org ? { organizationId: org._id } : "skip"
    )

    // Get current user's membership to check permissions
    const user = useQuery(api.users.me)
    const members = useQuery(
        api.organizations.listMembers,
        org ? { organizationId: org._id } : "skip"
    )

    const currentMember = React.useMemo(() => {
        if (!user || !members) return null
        return members.find(m => m.user?._id === user._id)
    }, [user, members])

    const canManageDevices = user?.role === "appAdmin" || currentMember?.role === "orgAdmin"

    // Create device mutation
    const createDevice = useMutation(api.devices.create)

    const handleCreateDevice = async (data: {
        name: string
        description: string
        tags: string[]
    }) => {
        if (!org) return

        await createDevice({
            id: uuidv4(),
            organizationId: org._id,
            name: data.name,
            description: data.description || undefined,
            tags: data.tags,
        })
    }

    // Loading state
    if (org === undefined || devices === undefined) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-28" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                    ))}
                </div>
            </div>
        )
    }

    // Org not found
    if (!org) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Organization not found</h2>
                    <p className="text-muted-foreground">
                        The organization you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
                    <p className="text-muted-foreground">
                        Manage devices in {org.name}
                    </p>
                </div>
                {canManageDevices && (
                    <Button onClick={() => setShowAddForm(true)}>
                        <Plus className="size-4 mr-2" />
                        Add Device
                    </Button>
                )}
            </div>

            <DeviceGrid devices={devices} orgSlug={params.slug} />

            <DeviceForm
                open={showAddForm}
                onOpenChange={setShowAddForm}
                onSubmit={handleCreateDevice}
                mode="create"
            />
        </div>
    )
}