'use client';

import * as React from 'react';
import Image from 'next/image';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { ImageIcon, TrashIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSite } from '@/providers/site-provider';
import { Button } from '@/components/ui/button';
import { AccessDenied } from '@/components/ui/not-found';

export default function AssetsPage() {
    const { site, permissions } = useSite();
    const assets = useQuery(api.siteAssets.list, { siteId: site._id });
    const generateUploadUrl = useMutation(api.siteAssets.generateUploadUrl);
    const createAsset = useMutation(api.siteAssets.create);
    const removeAsset = useMutation(api.siteAssets.remove);

    const [uploading, setUploading] = React.useState(false);
    const [removingId, setRemovingId] = React.useState<Id<'siteAssets'> | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (!permissions.org.site.asset.view) {
        return <AccessDenied />;
    }

    const canManage = permissions.org.site.asset.manage;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        setUploading(true);
        try {
            const uploadUrl = await generateUploadUrl({ siteId: site._id });
            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file,
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };
            await createAsset({ siteId: site._id, storageId, filename: file.name, contentType: file.type });
            toast.success('Image uploaded');
        } catch {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (assetId: Id<'siteAssets'>, filename: string) => {
        setRemovingId(assetId);
        try {
            await removeAsset({ assetId });
            toast.success(`Removed "${filename}"`);
        } catch {
            toast.error('Failed to remove image');
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Images</h1>
                    <p className="text-sm text-muted-foreground">
                        Site-scoped images available for manual data entries.
                    </p>
                </div>
                {canManage && (
                    <>
                        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            <UploadIcon data-icon="inline-start" />
                            {uploading ? 'Uploading…' : 'Upload image'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </>
                )}
            </div>

            {assets === undefined ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                    <ImageIcon className="size-10 opacity-30" />
                    <p className="text-sm">No images yet.</p>
                    {canManage && (
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <UploadIcon data-icon="inline-start" />
                            Upload your first image
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {assets.map((asset) => (
                        <div
                            key={asset._id}
                            className="group relative aspect-square rounded-lg border bg-muted overflow-hidden"
                        >
                            {asset.url ? (
                                <Image src={asset.url} alt={asset.filename} fill className="object-contain p-2" />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="size-6 text-muted-foreground" />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                <p className="text-xs text-white truncate">{asset.filename}</p>
                            </div>
                            {canManage && (
                                <button
                                    className="absolute top-2 right-2 size-6 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    onClick={() => handleRemove(asset._id, asset.filename)}
                                    disabled={removingId === asset._id}
                                >
                                    <TrashIcon className="size-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
