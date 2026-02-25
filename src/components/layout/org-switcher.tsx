'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Organization = {
    _id: string;
    name: string;
    slug: string;
    logoUrl?: string;
};

function getOrgInitials(name: string): string {
    const words = name.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export function OrgSwitcher({
    organizations,
    currentOrg,
}: {
    organizations: Organization[];
    currentOrg?: Organization;
}) {
    const { isMobile } = useSidebar();
    const router = useRouter();

    if (!currentOrg) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" render={<Link href="/" />}>
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Building2 className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">Select Organization</span>
                            <span className="truncate text-xs">Choose an org to continue</span>
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
                                <AvatarImage src={currentOrg.logoUrl} alt={currentOrg.name} />
                                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    {getOrgInitials(currentOrg.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{currentOrg.name}</span>
                                <span className="truncate text-xs">{currentOrg.slug}</span>
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
                            <DropdownMenuLabel className="text-muted-foreground text-xs">
                                Organizations
                            </DropdownMenuLabel>
                            {organizations.map((org) => (
                                <DropdownMenuItem
                                    key={org._id}
                                    onClick={() => router.push(`/org/${org.slug}/devices`)}
                                    className="gap-2 p-2"
                                >
                                    <Avatar className="size-6 rounded-md after:border-0">
                                        <AvatarImage src={org.logoUrl} alt={org.name} />
                                        <AvatarFallback className="rounded-md text-xs">
                                            {getOrgInitials(org.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate">{org.name}</span>
                                    {org._id === currentOrg._id && (
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
                                <span className="text-muted-foreground font-medium">View all orgs</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
