import * as React from 'react';
import { InboxSidebar } from '@/components/inbox-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': '360px',
                } as React.CSSProperties
            }
        >
            <InboxSidebar />
            <SidebarInset className="min-w-0 overflow-hidden">{children}</SidebarInset>
        </SidebarProvider>
    );
}
