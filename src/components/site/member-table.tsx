'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { MoreHorizontal, Shield, Trash2, User } from 'lucide-react';
import type { Id } from '@convex/dataModel';

type Member = {
    actor: {
        _id: Id<'actors'>;
        name?: string;
        email?: string;
        avatarUrl?: string | null;
    } | null;
    role: 'siteAdmin' | 'user';
};

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
    const [memberToRemove, setMemberToRemove] = React.useState<Member | null>(null);
    const [isRemoving, setIsRemoving] = React.useState(false);

    const updateMemberRole = useMutation(api.sites.updateMemberRole);
    const removeMember = useMutation(api.sites.removeMember);

    const handleRoleChange = async (actorId: Id<'actors'>, newRole: 'siteAdmin' | 'user') => {
        await updateMemberRole({
            siteId,
            actorId,
            role: newRole,
        });
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove?.actor) return;

        setIsRemoving(true);
        try {
            await removeMember({
                siteId,
                actorId: memberToRemove.actor._id,
            });
            setMemberToRemove(null);
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <>
            <div className="border rounded-lg">
                <div className="grid grid-cols-[1fr,auto,auto] gap-4 p-4 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
                    <div>Member</div>
                    <div className="w-24 text-center">Role</div>
                    {canManage && <div className="w-10" />}
                </div>

                {members.map((member) => {
                    if (!member.actor) return null;

                    const isCurrentActor = member.actor._id === currentActorId;
                    const isOnlyAdmin =
                        member.role === 'siteAdmin' && members.filter((m) => m.role === 'siteAdmin').length === 1;

                    return (
                        <div
                            key={member.actor._id}
                            className="grid grid-cols-[1fr,auto,auto] gap-4 p-4 border-b last:border-b-0 items-center"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="size-9">
                                    <AvatarImage src={member.actor.avatarUrl ?? undefined} alt={member.actor.name} />
                                    <AvatarFallback>
                                        {getInitials(member.actor.name, member.actor.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-medium truncate">
                                        {member.actor.name || 'Unnamed Actor'}
                                        {isCurrentActor && (
                                            <span className="text-muted-foreground font-normal ml-2">(you)</span>
                                        )}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">{member.actor.email}</p>
                                </div>
                            </div>

                            <div className="w-24 flex justify-center">
                                <Badge
                                    variant={member.role === 'siteAdmin' ? 'default' : 'secondary'}
                                    className="capitalize"
                                >
                                    {member.role === 'siteAdmin' ? (
                                        <Shield className="size-3 mr-1" />
                                    ) : (
                                        <User className="size-3 mr-1" />
                                    )}
                                    {member.role === 'siteAdmin' ? 'Admin' : 'Member'}
                                </Badge>
                            </div>

                            {canManage && (
                                <div className="w-10">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                nativeButton={false}
                                                render={<div />}
                                            >
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {member.role === 'user' ? (
                                                <DropdownMenuItem
                                                    onClick={() => handleRoleChange(member.actor!._id, 'siteAdmin')}
                                                >
                                                    <Shield className="size-4 mr-2" />
                                                    Make Admin
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    onClick={() => handleRoleChange(member.actor!._id, 'user')}
                                                    disabled={isOnlyAdmin}
                                                >
                                                    <User className="size-4 mr-2" />
                                                    Remove Admin
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setMemberToRemove(member)}
                                                disabled={isCurrentActor || isOnlyAdmin}
                                            >
                                                <Trash2 className="size-4 mr-2" />
                                                Remove Member
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                    );
                })}

                {members.length === 0 && <div className="p-8 text-center text-muted-foreground">No members found</div>}
            </div>

            {/* Remove Member Dialog */}
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
                        <Button variant="destructive" onClick={handleRemoveMember} disabled={isRemoving}>
                            {isRemoving ? 'Removing...' : 'Remove Member'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
