import * as React from 'react';
import { InboxSidebar } from '@/components/inbox-sidebar';
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': '360px',
                } as React.CSSProperties
            }
        >
            <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
                <InboxSidebar />
                <SidebarInset className="min-w-0 overflow-hidden">{children}</SidebarInset>
            </React.Suspense>
        </SidebarProvider>
    );
}
