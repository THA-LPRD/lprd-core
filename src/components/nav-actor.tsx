'use client';

import { ChevronsUpDown, Inbox, LayoutDashboard, LogOut, Settings, Shield } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

function getInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export function NavActor({
    actor,
    canAccessAdmin,
    onSignOut,
    context,
}: {
    actor: {
        name?: string;
        email: string;
        avatar?: string;
    };
    canAccessAdmin?: boolean;
    onSignOut?: () => void;
    context?: 'site' | 'admin';
}) {
    const { isMobile } = useSidebar();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<div />} nativeButton={false}>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-full">
                                <AvatarImage src={actor.avatar} alt={actor.name} />
                                <AvatarFallback className="rounded-full">{getInitials(actor.name)}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{actor.name || 'Actor'}</span>
                                <span className="truncate text-xs">{actor.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-lg"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={actor.avatar} alt={actor.name} />
                                        <AvatarFallback className="rounded-lg">
                                            {getInitials(actor.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{actor.name || 'Actor'}</span>
                                        <span className="truncate text-xs">{actor.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem render={<Link href="/settings" />}>
                                <Settings />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<Link href="/inbox" />}>
                                <Inbox />
                                Inbox
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        {canAccessAdmin && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    {context === 'admin' ? (
                                        <DropdownMenuItem render={<Link href="/" />}>
                                            <LayoutDashboard />
                                            My Sites
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem render={<Link href="/admin" />}>
                                            <Shield />
                                            Admin Panel
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={onSignOut}>
                                <LogOut />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
