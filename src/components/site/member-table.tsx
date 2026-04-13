'use client';

import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from '@/components/ui/data-table';
import { Clock, MoreHorizontal, Shield, Trash2, User, UserPlus, X } from 'lucide-react';
import type { Id } from '@convex/dataModel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { requestJson } from '@/lib/api-client';

type Member = {
    actor: {
        _id: Id<'actors'>;
        publicId: string;
        name?: string;
        avatarUrl?: string | null;
    } | null;
    role: 'siteAdmin' | 'user';
};

type VisibleMember = Member & { actor: NonNullable<Member['actor']> };

function getInitials(name?: string, fallback?: string): string {
    if (name) {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }
    if (fallback) {
        return fallback.slice(0, 2).toUpperCase();
    }
    return '?';
}

const ROLE_CONFIG: Record<Member['role'], { label: string; dot: string; text: string }> = {
    siteAdmin: {
        label: 'Admin',
        dot: 'bg-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    user: {
        label: 'Member',
        dot: 'bg-zinc-400',
        text: 'text-zinc-500 dark:text-zinc-400',
    },
};

function RoleIndicator({ role }: { role: Member['role'] }) {
    const cfg = ROLE_CONFIG[role];
    return (
        <div className="flex items-center gap-2">
            <span className={cn('inline-flex size-2 shrink-0 rounded-full', cfg.dot)} />
            <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
        </div>
    );
}

export function MemberTable({
    members,
    siteId,
    currentActorId,
    canManage,
}: {
    members: Member[];
    siteId: Id<'sites'>;
    currentActorId?: Id<'actors'>;
    canManage: boolean;
}) {
    const [memberToRemove, setMemberToRemove] = React.useState<VisibleMember | null>(null);
    const [isRemoving, setIsRemoving] = React.useState(false);
    const [publicId, setPublicId] = React.useState('');
    const [isInviting, setIsInviting] = React.useState(false);
    const [revokingInviteId, setRevokingInviteId] = React.useState<Id<'siteInvites'> | null>(null);

    const updateMemberRole = useMutation(api.siteActors.updateMemberRole);
    const removeActor = useMutation(api.siteActors.removeActor);
    const pendingInvites = useQuery(api.siteInvites.listForSite, canManage ? { siteId } : 'skip') ?? [];

    const visibleMembers = members.filter((member): member is VisibleMember => member.actor !== null);
    const adminCount = visibleMembers.filter((member) => member.role === 'siteAdmin').length;

    const handleRoleChange = async (actorId: Id<'actors'>, newRole: 'siteAdmin' | 'user') => {
        await updateMemberRole({ siteId, actorId, role: newRole });
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;
        setIsRemoving(true);
        try {
            await removeActor({ siteId, actorId: memberToRemove.actor._id });
            setMemberToRemove(null);
        } finally {
            setIsRemoving(false);
        }
    };

    const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedPublicId = publicId.trim();
        if (!trimmedPublicId) return;

        setIsInviting(true);
        try {
            await requestJson<{ id: Id<'siteInvites'> }>(`/api/v2/sites/${siteId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: trimmedPublicId }),
            });
            setPublicId('');
            toast.success('Invite sent');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invite');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRevokeInvite = async (inviteId: Id<'siteInvites'>) => {
        setRevokingInviteId(inviteId);
        try {
            await requestJson<{ ok: true }>(`/api/v2/sites/${siteId}/invites/${inviteId}/revoke`, { method: 'POST' });
            toast.success('Invite revoked');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to revoke invite');
        } finally {
            setRevokingInviteId(null);
        }
    };

    return (
        <>
            {canManage && (
                <div className="mb-6 grid gap-4">
                    <form className="rounded-lg border p-4" onSubmit={(event) => void handleInvite(event)}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <Label htmlFor="invite-public-id">Invite by public ID</Label>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Users can find their public ID in settings.
                                </p>
                                <Input
                                    id="invite-public-id"
                                    value={publicId}
                                    onChange={(event) => setPublicId(event.target.value)}
                                    placeholder="actor public ID"
                                    className="mt-2"
                                />
                            </div>
                            <Button type="submit" disabled={isInviting || !publicId.trim()}>
                                <UserPlus className="size-3.5" />
                                {isInviting ? 'Inviting...' : 'Invite'}
                            </Button>
                        </div>
                    </form>

                    {pendingInvites.length > 0 && (
                        <div className="rounded-lg border">
                            <div className="flex items-center gap-2 border-b px-4 py-3">
                                <Clock className="size-4 text-muted-foreground" />
                                <p className="text-sm font-medium">Pending invites</p>
                            </div>
                            <div className="divide-y">
                                {pendingInvites.map((item) => (
                                    <div
                                        key={item.invite._id}
                                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar className="size-8 shrink-0">
                                                <AvatarImage
                                                    src={item.targetActor?.avatarUrl ?? undefined}
                                                    alt={item.targetActor?.name}
                                                />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(item.targetActor?.name, item.targetActor?.publicId)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {item.targetActor?.name ?? 'Unknown user'}
                                                </p>
                                                <p className="truncate font-mono text-xs text-muted-foreground">
                                                    {item.targetActor?.publicId ?? 'unresolved'}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    Invited by {item.invitedByActor?.name ?? 'Unknown user'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={revokingInviteId === item.invite._id}
                                            onClick={() => void handleRevokeInvite(item.invite._id)}
                                        >
                                            <X className="size-3.5" />
                                            {revokingInviteId === item.invite._id ? 'Revoking...' : 'Revoke'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <DataTable
                rows={visibleMembers}
                getRowKey={(m) => m.actor._id}
                emptyTitle="No members yet"
                emptyDescription="Members will appear here when they are added to this site."
            >
                <DataTableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="w-64">Public ID</TableHead>
                        <TableHead className="w-24">Role</TableHead>
                        {canManage && <TableHead className="w-10 text-right">Actions</TableHead>}
                    </TableRow>
                </DataTableHeader>
                <DataTableBody>
                    <DataTableRow>
                        {(member: VisibleMember) => {
                            const isCurrentActor = member.actor._id === currentActorId;
                            const isOnlyAdmin = member.role === 'siteAdmin' && adminCount === 1;
                            const displayName = member.actor.name || 'Unnamed Actor';

                            return (
                                <>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-8 shrink-0">
                                                <AvatarImage
                                                    src={member.actor.avatarUrl ?? undefined}
                                                    alt={displayName}
                                                />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(member.actor.name, member.actor.publicId)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <p className="truncate text-sm font-medium">{displayName}</p>
                                                    {isCurrentActor && (
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="truncate font-mono text-xs text-muted-foreground/60">
                                                    {member.actor._id.slice(0, 8)}...
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="w-64 min-w-0">
                                        <p className="truncate font-mono text-xs text-muted-foreground">
                                            {member.actor.publicId}
                                        </p>
                                    </TableCell>
                                    <TableCell className="w-24">
                                        <RoleIndicator role={member.role} />
                                    </TableCell>
                                    {canManage && (
                                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="text-muted-foreground hover:text-foreground"
                                                            />
                                                        }
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {member.role === 'user' ? (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    void handleRoleChange(member.actor._id, 'siteAdmin')
                                                                }
                                                            >
                                                                <Shield className="mr-2 size-4" />
                                                                Make Admin
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    void handleRoleChange(member.actor._id, 'user')
                                                                }
                                                                disabled={isOnlyAdmin}
                                                            >
                                                                <User className="mr-2 size-4" />
                                                                Remove Admin
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setMemberToRemove(member)}
                                                            disabled={isCurrentActor || isOnlyAdmin}
                                                        >
                                                            <Trash2 className="mr-2 size-4" />
                                                            Remove Member
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    )}
                                </>
                            );
                        }}
                    </DataTableRow>
                </DataTableBody>
            </DataTable>

            <Dialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove{' '}
                            <strong>{memberToRemove?.actor?.name || memberToRemove?.actor?.publicId}</strong> from this
                            site? They will lose access to all resources.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMemberToRemove(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => void handleRemoveMember()} disabled={isRemoving}>
                            {isRemoving ? 'Removing...' : 'Remove Member'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
