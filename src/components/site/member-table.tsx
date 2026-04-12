'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, Shield, Trash2, User } from 'lucide-react';
import type { Id } from '@convex/dataModel';
import { cn } from '@/lib/utils';

type Member = {
    actor: {
        _id: Id<'actors'>;
        name?: string;
        email?: string;
        avatarUrl?: string | null;
    } | null;
    role: 'siteAdmin' | 'user';
};

type VisibleMember = Member & { actor: NonNullable<Member['actor']> };

function getInitials(name?: string, email?: string): string {
    if (name) {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }
    if (email) {
        return email.slice(0, 2).toUpperCase();
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

    const updateMemberRole = useMutation(api.siteActors.updateMemberRole);
    const removeActor = useMutation(api.siteActors.removeActor);

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

    return (
        <>
            <DataTable
                rows={visibleMembers}
                getRowKey={(m) => m.actor._id}
                emptyTitle="No members yet"
                emptyDescription="Members will appear here when they are added to this site."
            >
                <DataTableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="w-64">Email</TableHead>
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
                            const email = member.actor.email || 'No email';

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
                                                    {getInitials(member.actor.name, member.actor.email)}
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
                                        <p className="truncate text-xs text-muted-foreground">{email}</p>
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
                            <strong>{memberToRemove?.actor?.name || memberToRemove?.actor?.email}</strong> from this
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
