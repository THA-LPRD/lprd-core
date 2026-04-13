'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Archive, Check, MailOpen, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getInboxFolderLabel, type InboxFolder, type InboxMessageItem } from '@/components/inbox-sidebar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { requestJson } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const inviteStatusLabels = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    revoked: 'Revoked',
    expired: 'Expired',
} as const;

async function runMessageAction(
    actorId: Id<'actors'>,
    messageId: Id<'systemMessages'>,
    action: string,
    method: 'POST' | 'DELETE' = 'POST',
) {
    return requestJson<{ ok: true }>(`/api/v2/actors/${actorId}/messages/${messageId}/${action}`, { method });
}

async function runInviteAction(siteId: Id<'sites'>, inviteId: Id<'siteInvites'>, action: 'accept' | 'decline') {
    return requestJson<{ ok: true }>(`/api/v2/sites/${siteId}/invites/${inviteId}/${action}`, { method: 'POST' });
}

export function InboxPage({ messageId }: { messageId?: Id<'systemMessages'> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const folder = (searchParams.get('folder') as InboxFolder | null) ?? 'inbox';

    const selectedMessage = useQuery(api.systemMessages.getMineById, messageId ? { messageId } : 'skip');
    const markedReadRef = React.useRef(new Set<string>());

    React.useEffect(() => {
        if (!selectedMessage) return;
        const messageFolder = selectedMessage.message.folder;
        if (messageFolder && messageFolder !== folder) {
            const params = new URLSearchParams(searchParams);
            params.set('folder', messageFolder);
            router.replace(`/inbox/${selectedMessage.message._id}?${params.toString()}`);
        }
    }, [folder, router, searchParams, selectedMessage]);

    React.useEffect(() => {
        if (!selectedMessage) return;
        const message = selectedMessage.message;
        if (message.readAt || markedReadRef.current.has(message._id)) return;
        markedReadRef.current.add(message._id);
        void requestJson<{ ok: true }>(`/api/v2/actors/${message.actorId}/messages/${message._id}/read`, {
            method: 'POST',
        });
    }, [selectedMessage]);

    const handleMessageAction = async (
        messageId: Id<'systemMessages'>,
        action: 'archive' | 'restore' | 'delete' | 'deleteForever',
    ) => {
        try {
            if (action === 'deleteForever') {
                const message = selectedMessage?.message;
                if (!message) throw new Error('Message not found');
                await requestJson<{ ok: true }>(`/api/v2/actors/${message.actorId}/messages/${messageId}`, {
                    method: 'DELETE',
                });
                toast.success('Message deleted');
                return;
            }

            const message = selectedMessage?.message;
            if (!message) throw new Error('Message not found');
            await runMessageAction(message.actorId, messageId, action);
            toast.success(action === 'delete' ? 'Message moved to deleted' : 'Message updated');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Message action failed');
        }
    };

    const handleInviteAction = async (inviteId: Id<'siteInvites'>, action: 'accept' | 'decline') => {
        try {
            const invite = selectedMessage?.siteInvite;
            if (!invite) throw new Error('Invite not found');
            await runInviteAction(invite.siteId, inviteId, action);
            toast.success(action === 'accept' ? 'Invite accepted' : 'Invite declined');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invite action failed');
        }
    };

    return (
        <>
            <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink render={<Link href="/inbox" />}>All Inboxes</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{getInboxFolderLabel(folder)}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto hidden text-sm text-muted-foreground sm:block">
                    System messages and site invitations
                </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-6">
                    {messageId && selectedMessage === undefined ? (
                        <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading...</div>
                    ) : !selectedMessage ? (
                        <Empty className="min-h-80 border">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <MailOpen />
                                </EmptyMedia>
                                <EmptyTitle>{messageId ? 'Message not found' : 'No message selected'}</EmptyTitle>
                                <EmptyDescription>
                                    {messageId
                                        ? 'This message is unavailable or no longer belongs to you.'
                                        : 'Choose a message from the sidebar.'}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <MessageDetail
                            item={selectedMessage}
                            folder={folder}
                            onInviteAction={handleInviteAction}
                            onMessageAction={handleMessageAction}
                        />
                    )}
                </div>
            </ScrollArea>
        </>
    );
}

function MessageDetail({
    item,
    folder,
    onInviteAction,
    onMessageAction,
}: {
    item: InboxMessageItem;
    folder: InboxFolder;
    onInviteAction: (inviteId: Id<'siteInvites'>, action: 'accept' | 'decline') => Promise<void>;
    onMessageAction: (
        messageId: Id<'systemMessages'>,
        action: 'archive' | 'restore' | 'delete' | 'deleteForever',
    ) => Promise<void>;
}) {
    const message = item.message;
    const invite = item.siteInvite;
    const isUnread = !message.readAt;
    const isPendingInvite = invite?.status === 'pending';

    return (
        <article
            className={cn(
                'rounded-lg border bg-background p-5 transition-colors',
                isUnread && 'border-foreground/20 bg-muted/30',
            )}
        >
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-medium">{message.title}</h2>
                            {isUnread && <Badge variant="secondary">Unread</Badge>}
                            {invite && (
                                <Badge variant={isPendingInvite ? 'default' : 'outline'}>
                                    {inviteStatusLabels[invite.status]}
                                </Badge>
                            )}
                        </div>
                        {message.body && <p className="text-sm text-muted-foreground">{message.body}</p>}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                        {isPendingInvite && folder !== 'deleted' && invite && (
                            <>
                                <Button size="sm" onClick={() => void onInviteAction(invite._id, 'accept')}>
                                    <Check className="size-3.5" />
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void onInviteAction(invite._id, 'decline')}
                                >
                                    <X className="size-3.5" />
                                    Decline
                                </Button>
                            </>
                        )}
                        {invite?.status === 'accepted' && item.site && (
                            <Button size="sm" variant="outline" render={<Link href="/" />} nativeButton={false}>
                                Open app
                            </Button>
                        )}
                        {folder === 'inbox' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void onMessageAction(message._id, 'archive')}
                            >
                                <Archive className="size-3.5" />
                                Archive
                            </Button>
                        )}
                        {folder !== 'deleted' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void onMessageAction(message._id, 'delete')}
                            >
                                <Trash2 className="size-3.5" />
                                Delete
                            </Button>
                        )}
                        {folder !== 'inbox' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void onMessageAction(message._id, 'restore')}
                            >
                                <RotateCcw className="size-3.5" />
                                Restore
                            </Button>
                        )}
                        {folder === 'deleted' && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void onMessageAction(message._id, 'deleteForever')}
                            >
                                Delete forever
                            </Button>
                        )}
                    </div>
                </div>

                {invite && (
                    <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">Site</p>
                            <p className="font-medium">{item.site?.name ?? 'Deleted site'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Invited by</p>
                            <p className="font-medium">{item.invitedByActor?.name ?? 'Unknown user'}</p>
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}
