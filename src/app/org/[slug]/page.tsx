"use client"

import {useParams} from "next/navigation"
import {useQuery} from "convex/react"
import {api} from "@convex/api"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Skeleton} from "@/components/ui/skeleton"

export default function OrgDashboardPage() {
    const params = useParams<{ slug: string }>()

    const org = useQuery(api.organizations.getBySlug, { slug: params.slug })

    const devices = useQuery(
        api.devices.listByOrganization,
        org ? { organizationId: org._id } : "skip"
    )

    const members = useQuery(
        api.organizations.listMembers,
        org ? { organizationId: org._id } : "skip"
    )

    // Loading state
    if (org === undefined || devices === undefined || members === undefined) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-28 rounded-lg" />
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

    const totalDevices = devices.length
    const activeDevices = devices.filter(d => d.status === "active").length
    const pendingDevices = devices.filter(d => d.status === "pending").length

    const stats = [
        { title: "Total Devices", value: totalDevices },
        { title: "Active Devices", value: activeDevices },
        { title: "Pending Devices", value: pendingDevices },
        { title: "Members", value: members.length },
    ]

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
                <p className="text-muted-foreground">Dashboard</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map(stat => (
                    <Card key={stat.title}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}