'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { slugToLabel } from '@/lib/slug';
import React from 'react';

export function DynamicBreadcrumbs() {
    const pathname = usePathname();
    const sites = useQuery(api.sites.list);

    // Parse the path
    const segments = pathname.split('/').filter(Boolean);

    // Build breadcrumb items
    const items: { label: string; href?: string }[] = [];

    if (segments[0] === 'site' && segments[1]) {
        const siteSlug = segments[1];
        const site = sites?.find((o) => o.slug === siteSlug);
        const siteName = site?.name ?? siteSlug;

        items.push({ label: siteName, href: `/site/${siteSlug}/devices` });

        if (segments[2] === 'devices') {
            if (segments[3]) {
                items.push({ label: 'Devices', href: `/site/${siteSlug}/devices` });
                items.push({ label: slugToLabel(segments[3]) });
            } else {
                items.push({ label: 'Devices' });
            }
        } else if (segments[2] === 'frames') {
            if (segments[3]) {
                items.push({ label: 'Frames', href: `/site/${siteSlug}/frames` });
                items.push({ label: slugToLabel(segments[3]) });
            } else {
                items.push({ label: 'Frames' });
            }
        } else if (segments[2] === 'templates') {
            if (segments[3]) {
                items.push({ label: 'Templates', href: `/site/${siteSlug}/templates` });
                items.push({ label: slugToLabel(segments[3]) });
            } else {
                items.push({ label: 'Templates' });
            }
        } else if (segments[2] === 'settings') {
            items.push({ label: 'Settings' });
        }
    } else if (pathname === '/') {
        items.push({ label: 'Sites' });
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                        <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
                            {item.href && index < items.length - 1 ? (
                                <BreadcrumbLink render={<Link href={item.href} />}>{item.label}</BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
