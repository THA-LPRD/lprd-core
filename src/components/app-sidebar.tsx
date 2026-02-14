'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LayoutTemplate, Monitor, Settings2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';

import { NavUser } from '@/components/nav-user';
import { OrgSwitcher } from '@/components/layout/org-switcher';
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
import Link from 'next/link';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuth();

    // Get current user
    const user = useQuery(api.users.me);

    // Get all organizations user has access to
    const organizations = useQuery(api.organizations.list);

    // Get current org from URL
    const slugMatch = pathname.match(/^\/org\/([^/]+)/);
    const currentSlug = slugMatch?.[1];

    // Find current org
    const currentOrg = React.useMemo(() => {
        if (!currentSlug || !organizations) return undefined;
        return organizations.find((org) => org.slug === currentSlug);
    }, [currentSlug, organizations]);

    // Update lastOrgSlug when visiting an org
    const setLastOrg = useMutation(api.users.setLastOrg);
    const lastSetSlugRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (currentSlug && user && lastSetSlugRef.current !== currentSlug) {
            lastSetSlugRef.current = currentSlug;
            setLastOrg({ slug: currentSlug });
        }
    }, [currentSlug, user, setLastOrg]);

    // Handle sign out
    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    // Navigation items for org context
    const navItems = currentOrg
        ? [
              {
                  title: 'Dashboard',
                  url: `/org/${currentOrg.slug}`,
                  icon: LayoutDashboard,
                  isActive: pathname === `/org/${currentOrg.slug}`,
              },
              {
                  title: 'Devices',
                  url: `/org/${currentOrg.slug}/devices`,
                  icon: Monitor,
                  isActive: pathname.startsWith(`/org/${currentOrg.slug}/devices`),
              },
              {
                  title: 'Templates',
                  url: `/org/${currentOrg.slug}/templates`,
                  icon: LayoutTemplate,
                  isActive: pathname.startsWith(`/org/${currentOrg.slug}/templates`),
              },
              {
                  title: 'Settings',
                  url: `/org/${currentOrg.slug}/settings`,
                  icon: Settings2,
                  isActive: pathname.startsWith(`/org/${currentOrg.slug}/settings`),
              },
          ]
        : [];

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <OrgSwitcher organizations={organizations ?? []} currentOrg={currentOrg} />
            </SidebarHeader>
            <SidebarContent>
                {currentOrg && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                        <SidebarMenu className={`gap-1.5`}>
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
                )}
            </SidebarContent>
            <SidebarFooter>
                {user && (
                    <NavUser
                        user={{
                            name: user.name,
                            email: user.email,
                            avatar: user.avatarUrl ?? undefined,
                        }}
                        onSignOut={handleSignOut}
                    />
                )}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
