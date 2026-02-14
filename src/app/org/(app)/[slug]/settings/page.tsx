"use client"

import * as React from "react"
import {useParams, useRouter} from "next/navigation"
import {useMutation, useQuery} from "convex/react"
import {api} from "@convex/api"
import {MemberTable} from "@/components/org/member-table"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Skeleton} from "@/components/ui/skeleton"
import {OrgNotFound, AccessDenied} from "@/components/ui/not-found"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Save, Trash2} from "lucide-react"

export default function OrgSettingsPage() {
    const params = useParams<{ slug: string }>()
    const router = useRouter()

    // Form state
    const [orgName, setOrgName] = React.useState("")
    const [isSaving, setIsSaving] = React.useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const [deleteConfirm, setDeleteConfirm] = React.useState("")
    const [isDeleting, setIsDeleting] = React.useState(false)

    // Get org by slug
    const org = useQuery(api.organizations.getBySlug, { slug: params.slug })

    // Get members
    const members = useQuery(
        api.organizations.listMembers,
        org ? { organizationId: org._id } : "skip"
    )

    // Get current user
    const user = useQuery(api.users.me)

    // Check permissions
    const currentMember = React.useMemo(() => {
        if (!user || !members) return null
        return members.find(m => m.user?._id === user._id)
    }, [user, members])

    const canManage = user?.role === "appAdmin" || currentMember?.role === "orgAdmin"

    // Mutations
    const updateOrg = useMutation(api.organizations.update)
    const deleteOrg = useMutation(api.organizations.remove)

    // Sync org name when loaded
    React.useEffect(() => {
        if (org) {
            setOrgName(org.name)
        }
    }, [org])

    const handleSaveSettings = async () => {
        if (!org || !orgName.trim()) return

        setIsSaving(true)
        try {
            await updateOrg({
                id: org._id,
                name: orgName.trim(),
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteOrg = async () => {
        if (!org || deleteConfirm !== org.name) return

        setIsDeleting(true)
        try {
            await deleteOrg({ id: org._id })
            router.push("/")
        } finally {
            setIsDeleting(false)
        }
    }

    // Loading state
    if (org === undefined || members === undefined) {
        return (
            <div className="p-6 max-w-4xl">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64 mb-8" />
                <div className="space-y-6">
                    <Skeleton className="h-48 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        )
    }

    if (!org) {
        return <OrgNotFound />
    }

    if (!canManage) {
        return <AccessDenied />
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage organization settings and members
                </p>
            </div>

            <div className="space-y-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>General</CardTitle>
                        <CardDescription>
                            Basic organization information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Organization Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="org-name"
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    className="max-w-md"
                                />
                                <Button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving || orgName === org.name || !orgName.trim()}
                                >
                                    <Save className="size-4 mr-2" />
                                    {isSaving ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Slug</Label>
                            <p className="text-sm text-muted-foreground">
                                {org.slug}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Members */}
                <Card>
                    <CardHeader>
                        <CardTitle>Members</CardTitle>
                        <CardDescription>
                            People who have access to this organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MemberTable
                            members={members}
                            organizationId={org._id}
                            currentUserId={user?._id}
                            canManage={canManage}
                        />
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>
                            Irreversible actions that affect the entire organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                            <div>
                                <p className="font-medium">Delete Organization</p>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete this organization and all its data
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="size-4 mr-2" />
                                Delete Organization
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Organization</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the organization
                            <strong> {org.name}</strong>, all devices, and remove all members.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="confirm-delete">
                            Type <strong>{org.name}</strong> to confirm
                        </Label>
                        <Input
                            id="confirm-delete"
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder={org.name}
                            className="mt-2"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false)
                                setDeleteConfirm("")
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteOrg}
                            disabled={isDeleting || deleteConfirm !== org.name}
                        >
                            {isDeleting ? "Deleting..." : "Delete Organization"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
