'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = useQuery(api.users.me);

    if (user === undefined) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!user || user.role !== 'appAdmin') {
        redirect('/');
    }

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset className="min-w-0 overflow-auto">
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 mt-1.5 data-[orientation=vertical]:h-4" />
                        <span className="text-sm font-medium text-muted-foreground">Admin</span>
                    </div>
                </header>
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
