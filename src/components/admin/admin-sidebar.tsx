'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Plug, Shield } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import Link from 'next/link';

import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();
    const user = useQuery(api.users.me);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const navItems = [
        {
            title: 'Dashboard',
            url: '/admin',
            icon: LayoutDashboard,
            isActive: pathname === '/admin',
        },
        {
            title: 'Plugins',
            url: '/admin/plugins',
            icon: Plug,
            isActive: pathname.startsWith('/admin/plugins'),
        },
    ];

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="pointer-events-none">
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <Shield className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">Platform Admin</span>
                                <span className="truncate text-xs text-muted-foreground">Management</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarMenu className="gap-1.5">
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    render={<Link href={item.url} />}
                                    tooltip={item.title}
                                    isActive={item.isActive}
                                >
                                    <item.icon />
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {user && (
                    <NavUser
                        user={{
                            name: user.name,
                            email: user.email,
                            avatar: user.avatarUrl ?? undefined,
                            role: user.role,
                        }}
                        onSignOut={handleSignOut}
                        context="admin"
                    />
                )}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
