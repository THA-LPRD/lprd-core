import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '@convex/api';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const auth = await withAuth();

    if (!auth.user || !auth.accessToken) {
        redirect('/login');
    }

    const actor = await fetchQuery(api.actors.me, {}, { token: auth.accessToken });

    if (!actor || actor.role !== 'appAdmin') {
        redirect('/site');
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
