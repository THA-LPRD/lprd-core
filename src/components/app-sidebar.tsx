'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LayoutGrid, LayoutTemplate, Monitor, Settings2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';

import { NavUser } from '@/components/nav-user';
import { SiteSwitcher } from '@/components/layout/org-switcher';
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

    // Get all sites user has access to
    const sites = useQuery(api.sites.list);

    // Get current site from URL
    const slugMatch = pathname.match(/^\/site\/([^/]+)/);
    const currentSlug = slugMatch?.[1];

    // Find current site
    const currentSite = React.useMemo(() => {
        if (!currentSlug || !sites) return undefined;
        return sites.find((s) => s.slug === currentSlug);
    }, [currentSlug, sites]);

    // Update lastSiteSlug when visiting a site
    const setLastSite = useMutation(api.users.setLastSite);
    const lastSetSlugRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (currentSlug && user && lastSetSlugRef.current !== currentSlug) {
            lastSetSlugRef.current = currentSlug;
            setLastSite({ slug: currentSlug });
        }
    }, [currentSlug, user, setLastSite]);

    // Handle sign out
    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    // Navigation items for site context
    const navItems = currentSite
        ? [
              {
                  title: 'Dashboard',
                  url: `/site/${currentSite.slug}`,
                  icon: LayoutDashboard,
                  isActive: pathname === `/site/${currentSite.slug}`,
              },
              {
                  title: 'Devices',
                  url: `/site/${currentSite.slug}/devices`,
                  icon: Monitor,
                  isActive: pathname.startsWith(`/site/${currentSite.slug}/devices`),
              },
              {
                  title: 'Frames',
                  url: `/site/${currentSite.slug}/frames`,
                  icon: LayoutGrid,
                  isActive: pathname.startsWith(`/site/${currentSite.slug}/frames`),
              },
              {
                  title: 'Templates',
                  url: `/site/${currentSite.slug}/templates`,
                  icon: LayoutTemplate,
                  isActive: pathname.startsWith(`/site/${currentSite.slug}/templates`),
              },
              {
                  title: 'Settings',
                  url: `/site/${currentSite.slug}/settings`,
                  icon: Settings2,
                  isActive: pathname.startsWith(`/site/${currentSite.slug}/settings`),
              },
          ]
        : [];

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SiteSwitcher sites={sites ?? []} currentSite={currentSite} />
            </SidebarHeader>
            <SidebarContent>
                {currentSite && (
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
                            role: user.role,
                        }}
                        onSignOut={handleSignOut}
                        context="site"
                    />
                )}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
