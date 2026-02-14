"use client"

import {usePathname} from "next/navigation"
import Link from "next/link"
import {useQuery} from "convex/react"
import {api} from "@convex/api"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

export function DynamicBreadcrumbs() {
    const pathname = usePathname()
    const organizations = useQuery(api.organizations.list)

    // Parse the path
    const segments = pathname.split("/").filter(Boolean)

    // Build breadcrumb items
    const items: { label: string; href?: string }[] = []

    if (segments[0] === "org" && segments[1]) {
        const orgSlug = segments[1]
        const org = organizations?.find(o => o.slug === orgSlug)
        const orgName = org?.name ?? orgSlug

        items.push({ label: orgName, href: `/org/${orgSlug}/devices` })

        if (segments[2] === "devices") {
            if (segments[3]) {
                // Device detail page
                items.push({ label: "Devices", href: `/org/${orgSlug}/devices` })
                items.push({ label: segments[3] }) // Device ID as current
            } else {
                // Devices list
                items.push({ label: "Devices" })
            }
        } else if (segments[2] === "templates") {
            if (segments[3]) {
                items.push({ label: "Templates", href: `/org/${orgSlug}/templates` })
                items.push({ label: "Editor" })
            } else {
                items.push({ label: "Templates" })
            }
        } else if (segments[2] === "settings") {
            items.push({ label: "Settings" })
        }
    } else if (pathname === "/") {
        items.push({ label: "Organizations" })
    }

    if (items.length === 0) {
        return null
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                        <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                            {item.href && index < items.length - 1 ? (
                                <BreadcrumbLink render={<Link href={item.href} />}>
                                    {item.label}
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}