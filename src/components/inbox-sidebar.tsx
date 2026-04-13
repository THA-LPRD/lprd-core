'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Archive, ArrowLeft, Inbox, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInput,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export type InboxFolder = 'inbox' | 'archive' | 'deleted';
export type InboxMessageItem = FunctionReturnType<typeof api.systemMessages.listMine>[number];

const folders: Array<{ id: InboxFolder; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'deleted', label: 'Deleted', icon: Trash2 },
];

const inviteStatusLabels = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    revoked: 'Revoked',
    expired: 'Expired',
} as const;

function formatTimestamp(value: number) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function getInboxFolderLabel(folder: InboxFolder) {
    return folders.find((item) => item.id === folder)?.label ?? 'Inbox';
}

export function InboxSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [query, setQuery] = React.useState('');

    const folder = (searchParams.get('folder') as InboxFolder | null) ?? 'inbox';
    const selectedMessageId = pathname.startsWith('/inbox/')
        ? (pathname.slice('/inbox/'.length) as Id<'systemMessages'>)
        : null;

    const messages = useQuery(api.systemMessages.listMine, { folder });

    const visibleMessages = React.useMemo(() => {
        if (!messages) return undefined;
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return messages;

        return messages.filter((item) => {
            const haystack = [
                item.message.title,
                item.message.body,
                item.site?.name,
                item.invitedByActor?.name,
                item.siteInvite?.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [messages, query]);

    return (
        <Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
            <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                className="md:h-8 md:p-0"
                                tooltip={{ children: 'Back to app', hidden: false }}
                                render={<Link href="/" />}
                            >
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <ArrowLeft className="size-4" />
                                </div>
                                <span className="sr-only">Back to app</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent className="px-1.5 md:px-0">
                            <SidebarMenu>
                                {folders.map((item) => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            tooltip={{ children: item.label, hidden: false }}
                                            onClick={() => router.push(`/inbox?folder=${item.id}`)}
                                            isActive={folder === item.id}
                                            className="px-2.5 md:px-2"
                                        >
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            <Sidebar collapsible="none" className="hidden flex-1 md:flex">
                <SidebarHeader className="gap-3.5 border-b p-4">
                    <div className="flex w-full items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-base font-medium text-foreground">
                                {getInboxFolderLabel(folder)}
                            </p>
                            <p className="text-xs text-muted-foreground">System messages</p>
                        </div>
                    </div>
                    <SidebarInput
                        placeholder="Search messages..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup className="px-0">
                        <SidebarGroupContent>
                            {!visibleMessages ? (
                                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                            ) : visibleMessages.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">No messages</div>
                            ) : (
                                visibleMessages.map((item) => {
                                    const message = item.message;
                                    const isSelected = selectedMessageId === message._id;
                                    const isUnread = !message.readAt;

                                    return (
                                        <Link
                                            key={message._id}
                                            href={`/inbox/${message._id}?folder=${folder}`}
                                            className={cn(
                                                'flex w-full flex-col items-start gap-2 border-b p-4 text-left text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                                isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
                                            )}
                                        >
                                            <div className="flex w-full min-w-0 items-center gap-2">
                                                <span className={cn('truncate', isUnread && 'font-semibold')}>
                                                    {message.title}
                                                </span>
                                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                                    {formatTimestamp(message.createdAt)}
                                                </span>
                                            </div>
                                            <div className="flex min-w-0 items-center gap-2">
                                                {isUnread && <span className="size-1.5 rounded-full bg-primary" />}
                                                {item.siteInvite && (
                                                    <Badge
                                                        variant={
                                                            item.siteInvite.status === 'pending' ? 'default' : 'outline'
                                                        }
                                                    >
                                                        {inviteStatusLabels[item.siteInvite.status]}
                                                    </Badge>
                                                )}
                                                {item.site && (
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        {item.site.name}
                                                    </span>
                                                )}
                                            </div>
                                            {message.body && (
                                                <span className="line-clamp-2 w-full text-xs whitespace-break-spaces text-muted-foreground">
                                                    {message.body}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })
                            )}
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </Sidebar>
    );
}
