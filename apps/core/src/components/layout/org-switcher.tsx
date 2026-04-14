'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@workspace/ui/components/sidebar';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Site = {
    _id: string;
    name: string;
    slug: string;
    logoUrl?: string;
};

function getSiteInitials(name: string): string {
    const words = name.split(' ').filter(Boolean);
    const [first, second] = words;
    if (first && second) {
        return (first.charAt(0) + second.charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export function SiteSwitcher({ sites, currentSite }: { sites: Site[]; currentSite?: Site }) {
    const { isMobile } = useSidebar();
    const router = useRouter();

    if (!currentSite) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" render={<Link href="/" />}>
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Building2 className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">Select Site</span>
                            <span className="truncate text-xs">Choose a site to continue</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<div />} nativeButton={false}>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="size-8 rounded-lg">
                                <AvatarImage src={currentSite.logoUrl} alt={currentSite.name} />
                                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    {getSiteInitials(currentSite.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{currentSite.name}</span>
                                <span className="truncate text-xs">{currentSite.slug}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-lg"
                        align="start"
                        side={isMobile ? 'bottom' : 'right'}
                        sideOffset={4}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-muted-foreground text-xs">Sites</DropdownMenuLabel>
                            {sites.map((site) => (
                                <DropdownMenuItem
                                    key={site._id}
                                    onClick={() => router.push(`/site/${site.slug}/devices`)}
                                    className="gap-2 p-2"
                                >
                                    <Avatar className="size-6 rounded-md after:border-0">
                                        <AvatarImage src={site.logoUrl} alt={site.name} />
                                        <AvatarFallback className="rounded-md text-xs">
                                            {getSiteInitials(site.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate">{site.name}</span>
                                    {site._id === currentSite._id && (
                                        <span className="text-xs text-muted-foreground">Current</span>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="gap-2 p-2" onClick={() => router.push('/')}>
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <Plus className="size-4" />
                                </div>
                                <span className="text-muted-foreground font-medium">View all sites</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
